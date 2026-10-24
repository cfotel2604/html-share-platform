import pg from 'pg';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { assertPostgresBackend } from './metadata-backend.mjs';
import { createD1Writer, bindProjectorTarget, projectOnce, projectionMetrics, MIN_INTERVAL_MS, PROPOSED_REVOKE_ALERT_MS } from './lib/public-projector.mjs';

export async function runProjector(environment = process.env) {
  // Manual opt-in job only. Web startup never launches it. No provision/credential discovery.
  if (environment.PROJECTOR_ENABLED !== '1' || environment.PROJECTOR_REMOTE_APPROVED !== '1') throw new Error('projector_disabled');
  assertPostgresBackend(environment);
  const intervalMs = Number(environment.PROJECTOR_INTERVAL_MS ?? MIN_INTERVAL_MS);
  const revokeAlertMs = Number(environment.PROJECTOR_REVOKE_ALERT_MS ?? PROPOSED_REVOKE_ALERT_MS);
  if (!Number.isSafeInteger(revokeAlertMs) || revokeAlertMs < 1000 || revokeAlertMs > 86400000
    || !Number.isSafeInteger(intervalMs) || intervalMs < MIN_INTERVAL_MS || intervalMs > 300000) throw new Error('invalid_config');
  const send = createD1Writer({ accountId: environment.D1_PROJECTOR_ACCOUNT_ID,
    databaseId: environment.D1_PROJECTOR_DATABASE_ID, token: environment.D1_PROJECTOR_API_TOKEN });
  const pool = new pg.Pool({ max: 2, connectionTimeoutMillis: 5000, query_timeout: 20000 });
  const log = value => process.stdout.write(JSON.stringify(value)+'\n');
  pool.on('error', () => log({ event: 'projector.db_unavailable' }));
  let stopped = false, nextMetrics = 0;
  const stop = () => { stopped = true; };
  process.on('SIGINT',stop); process.on('SIGTERM',stop);
  try {
    await bindProjectorTarget(pool,send.targetFingerprint);
    while (!stopped) {
      try {
        const result = await projectOnce(pool,send,{intervalMs,log});
        if (Date.now() >= nextMetrics) {
          const metrics = await projectionMetrics(pool,{revokeAlertMs});
          log({ event: metrics.revoke_over_proposal ? 'projector.revoke_over_proposal' : 'projector.metrics', ...metrics });
          nextMetrics = Date.now()+60000;
        }
        await sleep(Math.min(1000,result.waitMs ?? 1000));
      } catch { log({ event: 'projector.tick_failed' }); await sleep(5000); }
    }
  } finally { process.off('SIGINT',stop); process.off('SIGTERM',stop); await pool.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runProjector().catch(() => { console.error('projector_stopped: verify explicit approval/configuration and private Node secrets'); process.exitCode=1; });
}
