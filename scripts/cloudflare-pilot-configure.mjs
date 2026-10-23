import { createClerkClient } from '@clerk/backend';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { cloudflareAccount } from './lib/cloudflare-account.mjs';
import { privateDirectory, readEnv, writeEnv, desktopConfig, healthReady } from './lib/pilot-config.mjs';

// Explicit mutation command; consumes only the operator's private Desktop config.
// Never send real email/SQL/secret values through Wrangler arguments or output.
try {
  process.env.CLERK_TELEMETRY_DISABLED = '1';
  const arg = process.argv.indexOf('--private-dir');
  const directory = privateDirectory(arg >= 0 ? process.argv[arg + 1] : null);
  const path = resolve(directory, 'resources.json');
  const state = JSON.parse(await readFile(path, 'utf8'));
  if (state.bucket !== 'hsp-pilot-desktop' || state.database !== 'hsp-pilot-desktop' ||
      state.origins?.studio !== 'http://localhost:3101') throw new Error('Unexpected pilot ownership record');
  const values = await readEnv(resolve(directory, '.env.desktop'));
  const config = desktopConfig(values);
  // Verify the key against Clerk before changing the deployed API secret.
  const clerk = createClerkClient({ secretKey: config.secret, publishableKey: config.publishable });
  try { await clerk.users.getUserList({ limit: 1 }); }
  catch { throw new Error('Clerk Development backend verification failed'); }
  const { accountId, api } = await cloudflareAccount();
  if (accountId !== state.accountId) throw new Error('Pilot account mismatch');
  const root = '/accounts/' + accountId;
  const databases = await api(root + '/d1/database');
  if (!databases.some(item => item.uuid === state.databaseId && item.name === state.database)) throw new Error('Pilot database mismatch');
  for (const { email, role } of config.emails) {
    const query = await api(root + `/d1/database/${state.databaseId}/query`, { method: 'POST', body: {
      sql: 'INSERT INTO auth_allowlist(email,role,status) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING RETURNING role,status',
      params: [email, role, 'active'],
    } });
    if (!query[0]?.results?.length) {
      const current = await api(root + `/d1/database/${state.databaseId}/query`, { method: 'POST', body: {
        sql: 'SELECT role,status FROM auth_allowlist WHERE email=?', params: [email],
      } });
      if (current[0]?.results?.[0]?.role !== role || current[0]?.results?.[0]?.status !== 'active') {
        throw new Error('Existing pilot allowlist policy differs; do not overwrite');
      }
    }
  }
  await api(root + '/workers/scripts/hsp-pilot-api/secrets', { method: 'PUT', body: {
    name: 'CLERK_SECRET_KEY', text: config.secret, type: 'secret_text',
  } });
  const generatedPath = resolve(directory, '.env.generated');
  const generated = await readEnv(generatedPath);
  await writeEnv(generatedPath, { ...generated, CLERK_PUBLISHABLE_KEY: config.publishable });
  await healthReady(state.origins.api, generated.CLOUDFLARE_SERVICE_TOKEN);
  state.healthCheckedAt = new Date().toISOString();
  state.clerkConfiguredAt = state.healthCheckedAt;
  state.allowlistEntries = config.emails.length;
  await writeFile(path, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ clerkBackend: 'reachable', apiHealth: 'ready', allowlistEntries: config.emails.length,
    r2S3CredentialPresent: Boolean(values.CLOUDFLARE_R2_ACCESS_KEY && values.CLOUDFLARE_R2_SECRET_KEY), cron: 'disabled' }));
} catch (error) {
  // Provider SDK errors may include identity; only emit our own configuration errors.
  console.error(error.constructor === Error ? error.message : 'Pilot configuration failed; inspect private settings');
  process.exitCode = 1;
}
