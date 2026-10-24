import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const projectSql = readFileSync(new URL('../../cloudflare/read-model/queries/project.sql', import.meta.url), 'utf8');
export const MIN_INTERVAL_MS = 5000; // At most60requests/5min; shared1200 quota is NOT exclusively ours.
export const PROPOSED_REVOKE_ALERT_MS = 60000; // Proposal only, not an owner-approved SLO.
const LOCK_ID = 330006;

export class ProjectionError extends Error {
  constructor(code, retryAfterMs = 0) { super(code); this.code = code; this.retryAfterMs = retryAfterMs; }
}

export function validateEvent(event) {
  const id = Number(event.id);
  if (!Number.isSafeInteger(id) || id <= 0 || !Array.isArray(event.payload) || event.payload.length < 1 || event.payload.length > 100) {
    throw new ProjectionError('invalid_event');
  }
  const keys = ['active_version','manifest','projection_version','share_code','site_id','status','updated_at'];
  const seen = new Set();
  for (const row of event.payload) {
    if (!row || JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(keys)
      || row.site_id !== event.site_id || !/^[a-f0-9]{32}$/.test(row.site_id)
      || !/^[A-Za-z0-9]{10}$/.test(row.share_code) || seen.has(row.share_code)
      || row.projection_version !== id || !['published','unpublished','revoked'].includes(row.status)
      || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(row.updated_at)
      || !Array.isArray(row.manifest) || row.manifest.length > 500) throw new ProjectionError('invalid_event');
    seen.add(row.share_code);
    if (row.status !== 'published') {
      if (row.active_version !== null || row.manifest.length) throw new ProjectionError('invalid_event');
      continue;
    }
    if (typeof row.active_version !== 'string' || !row.active_version) throw new ProjectionError('invalid_event');
    const paths = new Set(); let total = 0;
    for (const asset of row.manifest) {
      if (!asset || JSON.stringify(Object.keys(asset).sort()) !== JSON.stringify(['etag','path','r2_key','size'])
        || typeof asset.path !== 'string' || !asset.path || paths.has(asset.path)
        || typeof asset.r2_key !== 'string' || !asset.r2_key
        || !Number.isSafeInteger(asset.size) || asset.size < 0 || (total += asset.size) > 104857600
        || typeof asset.etag !== 'string' || !/^[A-Za-z0-9-]{1,128}$/.test(asset.etag)) throw new ProjectionError('invalid_event');
      paths.add(asset.path);
    }
    if (!paths.has('index.html')) throw new ProjectionError('invalid_event');
  }
  return event.payload.map(row => ({ sql: projectSql, params: [row.share_code,row.site_id,row.status,row.active_version,
    JSON.stringify(row.manifest),id,row.updated_at] }));
}

export function createD1Writer({ accountId, databaseId, token, fetcher = fetch }) {
  if (!/^[a-f0-9]{32}$/.test(accountId ?? '') || !/^[a-f0-9-]{36}$/.test(databaseId ?? '')
    || typeof token !== 'string' || !token || /[\r\n]/.test(token)) throw new ProjectionError('invalid_config');
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const send = async event => {
    const batch = validateEvent(event);
    let response;
    try {
      response = await fetcher(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ batch }) });
    } catch { throw new ProjectionError('network'); }
    if (!response.ok) {
      const header = response.headers.get('retry-after');
      const retryAfterMs = header && /^\d+$/.test(header) ? Number(header) * 1000
        : header ? Math.max(0, Date.parse(header) - Date.now()) || 0 : 0;
      await response.body?.cancel().catch(() => {});
      throw new ProjectionError(response.status === 429 ? 'rate_limited' : `http_${response.status}`, retryAfterMs);
    }
    let result;
    try { result = await response.json(); } catch { throw new ProjectionError('invalid_response'); }
    // Never propagate provider error text, SQL, response rows or credential-bearing exceptions.
    if (result.success !== true || !Array.isArray(result.result) || result.result.length !== batch.length
      || result.result.some(item => item.success !== true)) throw new ProjectionError('batch_failed');
  };
  Object.defineProperty(send,'targetFingerprint',{value:createHash('sha256').update(accountId+'/'+databaseId).digest('hex')});
  return send;
}

export async function bindProjectorTarget(pool,fingerprint) {
  if (!/^[a-f0-9]{64}$/.test(fingerprint ?? '')) throw new ProjectionError('invalid_config');
  const result = await pool.query(`UPDATE public_projection_control SET target_fingerprint=$1
    WHERE id=1 AND (target_fingerprint IS NULL OR target_fingerprint=$1) RETURNING id`,[fingerprint]);
  if (!result.rowCount) throw new ProjectionError('target_mismatch');
}

export async function projectionMetrics(pool, { revokeAlertMs = PROPOSED_REVOKE_ALERT_MS } = {}) {
  const { rows: [row] } = await pool.query(`SELECT count(*)::int AS pending,
    count(*) FILTER(WHERE has_revoke)::int AS pending_revocations,
    coalesce(extract(epoch FROM clock_timestamp()-min(enqueued_at) FILTER(WHERE has_revoke))*1000,0)::float8 AS oldest_revoke_ms
    FROM public_projection_outbox WHERE state='pending'`);
  return { pending: row.pending, pending_revocations: row.pending_revocations,
    oldest_revoke_ms: Math.max(0,row.oldest_revoke_ms), revoke_threshold_proposal_ms: revokeAlertMs,
    revoke_over_proposal: row.pending_revocations > 0 && row.oldest_revoke_ms > revokeAlertMs };
}

export async function projectOnce(pool, sendBatch, { intervalMs = MIN_INTERVAL_MS, log = () => {} } = {}) {
  if (!Number.isSafeInteger(intervalMs) || intervalMs < MIN_INTERVAL_MS || intervalMs > 300000) throw new ProjectionError('invalid_config');
  const client = await pool.connect();
  let locked = false, discard = false;
  try {
    locked = (await client.query('SELECT pg_try_advisory_lock($1) AS locked',[LOCK_ID])).rows[0].locked;
    if (!locked) return { state: 'contended' };
    // Head-of-line per site prevents a newer revoke being followed by an older
    // publication. Revoke-containing chains outrank normal work across sites.
    const { rows: [event] } = await client.query(`SELECT e.*,
      CASE WHEN current_setting('track_commit_timestamp')='on'
        THEN pg_xact_commit_timestamp((e.source_tx % 4294967296)::text::xid) END AS committed_at
      FROM public_projection_outbox e WHERE state='pending' AND payload IS NOT NULL AND next_attempt_at<=clock_timestamp()
      AND NOT EXISTS(SELECT 1 FROM public_projection_outbox older WHERE older.site_id=e.site_id AND older.id<e.id AND older.state='pending')
      ORDER BY EXISTS(SELECT 1 FROM public_projection_outbox urgent WHERE urgent.site_id=e.site_id AND urgent.state='pending' AND urgent.has_revoke) DESC,
      EXISTS(SELECT 1 FROM public_projection_outbox urgent WHERE urgent.site_id=e.site_id AND urgent.state='pending' AND urgent.priority) DESC,e.id LIMIT 1`);
    if (!event) return { state: 'idle' };
    const { rows: [control] } = await client.query('SELECT next_request_at,clock_timestamp() AS now FROM public_projection_control WHERE id=1');
    const waitMs = new Date(control.next_request_at).getTime() - new Date(control.now).getTime();
    if (waitMs > 0) return { state: 'throttled', waitMs };
    // Reserve the slot durably BEFORE REST, so crashes/restarts cannot burst.
    await client.query("UPDATE public_projection_control SET next_request_at=clock_timestamp()+$1*interval '1 millisecond' WHERE id=1",[intervalMs]);
    const { rows: [attempt] } = await client.query(`UPDATE public_projection_outbox SET attempts=attempts+1,last_attempt_at=clock_timestamp()
      WHERE id=$1 RETURNING attempts`,[event.id]);
    try {
      await sendBatch(event); // Exactly one REST batch/event/attempt. No preflight REST reads.
    } catch (error) {
      const safeCodes = ['network','invalid_event','invalid_response','batch_failed','invalid_config','rate_limited'];
      const code = error instanceof ProjectionError && (safeCodes.includes(error.code) || /^http_[1-5][0-9]{2}$/.test(error.code))
        ? error.code : 'transport_failed';
      const retryAfterMs = error instanceof ProjectionError && Number.isFinite(error.retryAfterMs) ? Math.max(0,error.retryAfterMs) : 0;
      const backoff = Math.min(300000,1000 * 2 ** Math.min(attempt.attempts,9));
      const authFailure = code === 'http_401' || code === 'http_403';
      const delay = Math.max(intervalMs,backoff,retryAfterMs,code === 'rate_limited' || authFailure ? 300000 : 0);
      await client.query(`UPDATE public_projection_outbox SET last_error=$2,
        next_attempt_at=clock_timestamp()+$3*interval '1 millisecond' WHERE id=$1`,[event.id,code,delay]);
      //429 freezes the whole job across instances, preserving the shared API budget.
      if (code === 'rate_limited' || authFailure) {
        await client.query("UPDATE public_projection_control SET next_request_at=greatest(next_request_at,clock_timestamp()+$1*interval '1 millisecond') WHERE id=1",[Math.max(delay,300000)]);
      }
      const metrics = { event: code === 'rate_limited' ? 'projector.rate_limited' : authFailure ? 'projector.auth_failed' : 'projector.retry',
        error_code: code, attempt: attempt.attempts, retry_ms: delay };
      log(metrics);
      return { state: 'retry', ...metrics };
    }
    const { rows: [projected] } = await client.query(`UPDATE public_projection_outbox SET state='projected',projected_at=clock_timestamp(),last_error=NULL
      WHERE id=$1 RETURNING projected_at`,[event.id]);
    const origin = event.committed_at ?? event.enqueued_at;
    const metrics = { event: 'projector.projected', attempt: attempt.attempts,
      lag_ms: Math.max(0,new Date(projected.projected_at).getTime()-new Date(origin).getTime()),
      lag_basis: event.committed_at ? 'commit' : 'enqueue_upper_bound' };
    log(metrics);
    return { state: 'projected', ...metrics };
  } finally {
    if (locked) { try { await client.query('SELECT pg_advisory_unlock($1)',[LOCK_ID]); } catch { discard = true; } }
    client.release(discard);
  }
}
