import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cloudflareAccount } from './lib/cloudflare-account.mjs';
import { privateDirectory, readEnv, healthReady } from './lib/pilot-config.mjs';

// Read-only provider smoke checks. Never print identities, tokens or URL paths.
try {
  const arg = process.argv.indexOf('--private-dir');
  const directory = privateDirectory(arg >= 0 ? process.argv[arg + 1] : null);
  const state = JSON.parse(await readFile(resolve(directory, 'resources.json'), 'utf8'));
  const generated = await readEnv(resolve(directory, '.env.generated'));
  const { accountId, api } = await cloudflareAccount();
  if (accountId !== state.accountId || state.bucket !== 'hsp-pilot-desktop') throw new Error('Pilot account/bucket mismatch');
  const root = '/accounts/' + accountId + '/r2/buckets/' + state.bucket;
  const managed = await api(root + '/domains/managed');
  const custom = await api(root + '/domains/custom');
  if (managed.enabled || (custom.domains ?? []).length) throw new Error('Public R2 bypass detected');
  const schema = await api('/accounts/' + accountId + `/d1/database/${state.databaseId}/query`, {
    method: 'POST', body: { sql: 'SELECT name FROM d1_migrations ORDER BY id', params: [] },
  });
  const migrations = schema[0]?.results?.map(row => row.name) ?? [];
  if (!migrations.includes('0003_cleanup_resweeps.sql')) throw new Error('Pilot D1 migration 0003 missing');
  const deployed = {};
  for (const [kind, name] of Object.entries({ api: 'hsp-pilot-api', public: 'hsp-pilot', preview: 'hsp-pilot-preview' })) {
    const result = await api('/accounts/' + accountId + `/workers/scripts/${name}/deployments`);
    deployed[kind] = result.deployments?.[0]?.versions?.map(version => ({ id: version.version_id, percentage: version.percentage })) ?? [];
    if (!deployed[kind].length) throw new Error('Pilot deployment receipt unavailable');
  }
  await healthReady(state.origins.api, generated.CLOUDFLARE_SERVICE_TOKEN);
  const checks = [
    ['health needs service credential', state.origins.api, '/internal/health', 401],
    ['API needs service and session', state.origins.api, '/v1/sites', 401],
    ['service alone cannot read metadata', state.origins.api, '/v1/sites', 401, { 'X-HSP-Service-Token': generated.CLOUDFLARE_SERVICE_TOKEN }],
    ['unknown public code', state.origins.public, '/A1b2C3d4E5/', 404],
    ['no root asset fallback', state.origins.public, '/assets/app.js', 404],
    ['no legacy host-ID alias', state.origins.public, '/' + 'a'.repeat(32) + '/', 404],
    ['unknown preview grant', state.origins.preview, '/' + 'a'.repeat(32) + '/', 404],
  ];
  const results = [];
  for (const [label, origin, path, expected, headers = {}] of checks) {
    const response = await fetch(origin + path, { headers, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (response.status !== expected || response.headers.has('set-cookie') ||
        !response.headers.get('cache-control')?.includes('no-store')) throw new Error('Provider denial check failed: ' + label);
    await response.body?.cancel();
    results.push({ check: label, status: response.status });
  }
  const report = { checkedAt: new Date().toISOString(), privateBucket: true, apiHealth: 'ready', migrations, deployed, checks: results };
  await writeFile(resolve(directory, 'provider-check.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
} catch (error) { console.error(error.message); process.exitCode = 1; }
