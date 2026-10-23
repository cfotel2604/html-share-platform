import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, createHmac } from 'node:crypto';
import { cloudflareAccount } from './lib/cloudflare-account.mjs';
import { privateDirectory, readEnv } from './lib/pilot-config.mjs';

// Read-only provider checks for exactly the operator's synthetic acceptance sites.
// Site identifiers, public codes and preview capabilities stay in private receipts.
try {
  const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
  const directory = privateDirectory(argument('--private-dir'));
  const stage = argument('--stage');
  const stages = ['initial', 'node-offline', 'a-unpublished', 'a-republished', 'a-revoked', 'a-reissued', 'a-final-unpublished', 'preview-expired'];
  if (!stages.includes(stage)) throw new Error('Select a documented acceptance stage');
  const resources = JSON.parse(await readFile(resolve(directory, 'resources.json'), 'utf8'));
  const generated = await readEnv(resolve(directory, '.env.generated'));
  const { accountId, api } = await cloudflareAccount();
  if (resources.accountId !== accountId || resources.database !== 'hsp-pilot-desktop') throw new Error('Pilot ownership mismatch');
  const query = async (sql, params = []) => (await api('/accounts/' + accountId + `/d1/database/${resources.databaseId}/query`, {
    method: 'POST', body: { sql, params },
  }))[0].results;
  const privatePath = resolve(directory, 'acceptance-state.json');
  let saved = { codes: {}, stages: [] };
  try { saved = JSON.parse(await readFile(privatePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const checks = [];
  const previewToken = (actor, key) => {
    const signature = createHmac('sha256', generated.CLOUDFLARE_SERVICE_TOKEN).update(`preview\0${actor}\0${key}`).digest();
    return createHash('sha256').update(Array.from(signature).join(',')).digest('hex').slice(0, 32);
  };
  async function check(url, expected, { html = false, canonical = false, asset = false } = {}) {
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (response.status !== expected || response.headers.has('set-cookie') || !response.headers.get('cache-control')?.includes('no-store')) {
      await response.body?.cancel(); throw new Error('Provider status/cache/cookie check failed');
    }
    if (html && (!response.headers.get('content-security-policy')?.startsWith('sandbox allow-scripts;') ||
        response.headers.get('content-security-policy')?.includes('allow-same-origin') || response.headers.get('x-content-type-options') !== 'nosniff')) {
      await response.body?.cancel(); throw new Error('Provider HTML sandbox check failed');
    }
    if (canonical && response.headers.get('location') !== url + '/') throw new Error('Canonical redirect check failed');
    if (asset && (response.headers.get('access-control-allow-origin') !== '*' || response.headers.has('access-control-allow-credentials'))) throw new Error('Asset CORS check failed');
    await response.body?.cancel();
  }
  if (stage === 'preview-expired' && (!saved.preview || Date.parse(saved.preview.expiresAt) > Date.now())) throw new Error('Preview expiry not reached');
  for (const [label, name] of stage === 'preview-expired' ? [] : [['A', 'Pilot acceptance A 2026-10-23'], ['B', 'Pilot acceptance B 500 files 2026-10-23']]) {
    const rows = await query(`SELECT s.id,s.status,s.active_version_id,l.code,
      (SELECT count(*) FROM version_assets a WHERE a.version_id=s.active_version_id) AS assets
      FROM sites s LEFT JOIN site_share_links l ON l.site_id=s.id AND l.revoked_at IS NULL WHERE s.display_name=?`, [name]);
    if (rows.length !== 1) throw new Error('Synthetic acceptance site not unique or absent');
    const site = rows[0];
    const unpublished = label === 'A' && ['a-unpublished', 'a-final-unpublished'].includes(stage);
    const revoked = label === 'A' && stage === 'a-revoked';
    if (site.status !== (unpublished ? 'unpublished' : 'published') || !site.active_version_id || !site.assets) throw new Error('Synthetic site state not ready for selected stage');
    saved.codes[label] ??= [];
    if (site.code && !saved.codes[label].includes(site.code)) saved.codes[label].push(site.code);
    if (revoked ? site.code !== null : !site.code) throw new Error('Unexpected active share mapping');
    for (const code of saved.codes[label]) {
      const active = !unpublished && !revoked && code === site.code;
      const base = resources.origins.public + '/' + code;
      await check(base + '/', active ? 200 : 404, { html: active });
      await check(base + '/nested/page.html', active ? 200 : 404, { html: active });
      if (active) {
        await check(base, 308, { canonical: true });
        await check(base + '/assets/module.js', 200, { asset: true });
        await check(base + '/unknown.html', 404);
      }
    }
    await check(resources.origins.public + '/' + site.id + '/', 404);
    if (label === 'A' && stage === 'a-reissued' && saved.codes.A.length < 2) throw new Error('Reissue did not create a distinct code');
    const versions = await query('SELECT count(*) AS n FROM version_assets a JOIN site_versions v ON v.id=a.version_id WHERE v.site_id=? GROUP BY v.id', [site.id]);
    const timing = await query(`SELECT i.expires_at,r.created_at FROM upload_intents i JOIN mutation_receipts r
      ON r.actor_id=i.actor_id AND r.action=?||i.id WHERE i.version_id=?`, ['upload.finalize:', site.active_version_id]);
    const duration = timing[0] ? Date.parse(timing[0].created_at) - (Date.parse(timing[0].expires_at) - 30 * 60000) : null;
    checks.push({ site: label, state: site.status, activeAssets: site.assets, maxVersionAssets: Math.max(...versions.map(row => row.n)), uploadDurationMs: duration, historicalCodesChecked: saved.codes[label].length });
    if (label === 'A' && stage === 'a-unpublished') {
      // Reconstruct only an already-authorized UI-created capability, in memory.
      // This does not insert a grant or bypass preview's DB/policy checks.
      const grants = await query(`SELECT g.token_hash,g.expires_at,r.actor_id,r.key FROM preview_grants g
        JOIN mutation_receipts r ON r.actor_id=g.actor_id AND r.action=? AND json_extract(r.response_json,'$.expiresAt')=g.expires_at
        WHERE g.site_id=? ORDER BY g.expires_at DESC LIMIT 5`, ['site.preview:' + site.id, site.id]);
      let verified = false;
      for (const grant of grants) {
        if (Date.parse(grant.expires_at) <= Date.now()) continue;
        const token = previewToken(grant.actor_id, grant.key);
        if (createHash('sha256').update(token).digest('hex') !== grant.token_hash) continue;
        await check(resources.origins.preview + '/' + token + '/', 200, { html: true });
        await check(resources.origins.preview + '/' + token + '/nested/page.html', 200, { html: true });
        saved.preview = { actor: grant.actor_id, key: grant.key, expiresAt: grant.expires_at };
        verified = true; break;
      }
      if (!verified) throw new Error('Fresh UI-created preview grant required');
      checks.push({ privatePreview: 'root/nested HTTP sandbox PASS' });
    }
  }
  if (saved.preview && Date.parse(saved.preview.expiresAt) <= Date.now()) {
    await check(resources.origins.preview + '/' + previewToken(saved.preview.actor, saved.preview.key) + '/', 404);
    checks.push({ expiredPreview: 'denied' });
  }
  await check(resources.origins.public + '/assets/data.json', 404);
  const report = { stage, checkedAt: new Date().toISOString(), result: 'PASS', checks };
  saved.stages.push(report);
  await writeFile(privatePath, JSON.stringify(saved, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
} catch {
  console.error('Provider acceptance stage failed; no paths, capabilities or provider payload logged'); process.exitCode = 1;
}
