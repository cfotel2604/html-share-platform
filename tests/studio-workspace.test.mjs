import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tsLoader } from './helpers/load-ts.mjs';

function fixture({ actor = { id: 'synthetic', role: 'employee' }, error } = {}) {
  let identity = 0, listings = 0;
  class AuthError extends Error { constructor(status) { super('synthetic'); this.status = status; } }
  const load = tsLoader({
    './auth': { AuthError, currentActor: async () => { identity++; if (error) throw new AuthError(error); return actor; } },
    './site-ops': { listSites: async current => { listings++; assert.equal(current, actor); return [{ id: 'synthetic' }]; } },
    './auth-config': { authMode: () => 'clerk', clerkAvailable: () => true },
    './demo-auth': { demoEnabled: () => false },
  });
  return { read: load(new URL('../src/lib/studio-workspace.ts', import.meta.url)).readStudioWorkspace,
    counts: () => ({ identity, listings }) };
}
test('workspace authorizes once and performs one filtered local listing; guests/denied list nothing', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('workspace called a Worker'));
  const signedIn = fixture();
  const data = await signedIn.read(new Request('https://studio.example.test/api/workspace'));
  assert.equal(data.auth.signedIn, true);
  assert.deepEqual(signedIn.counts(), { identity: 1, listings: 1 });
  for (const options of [{ actor: null }, { error: 403 }]) {
    const f = fixture(options), result = await f.read(new Request('https://studio.example.test/api/workspace'));
    assert.equal(result.auth.signedIn, false);
    assert.deepEqual(result.sites, []);
    assert.deepEqual(f.counts(), { identity: 1, listings: 0 });
    assert.equal(Boolean(result.auth.denied), Boolean(options.error));
  }
  await assert.rejects(fixture({ error: 503 }).read(new Request('https://studio.example.test/api/workspace')), error => error.status === 503);
  await assert.rejects(fixture({ error: 404 }).read(new Request('https://viewer.example.test/api/workspace')), error => error.status === 404);
});

test('workspace adapter coalesces concurrent mounts, then revalidates on the next read', async () => {
  const { createStudioApi } = tsLoader()(new URL('../src/features/studio/api.ts', import.meta.url));
  let calls = 0, release;
  const api = createStudioApi(async (path, init) => {
    calls++;
    assert.equal(path, '/api/workspace'); assert.equal(init.credentials, 'same-origin'); assert.equal(init.cache, 'no-store');
    await new Promise(resolve => { release = resolve; });
    return Response.json({ auth: { signedIn: true }, sites: [] });
  });
  const first = api.workspace(), second = api.workspace();
  assert.equal(first, second); assert.equal(calls, 1);
  release(); await first;
  const third = api.workspace(); assert.equal(calls, 2); release(); await third;
});

test('failed workspace reads are retried and never cached as an authorization result', async () => {
  const { createStudioApi } = tsLoader()(new URL('../src/features/studio/api.ts', import.meta.url));
  let calls = 0;
  const api = createStudioApi(async () => ++calls === 1 ? Response.json({ error: 'unavailable' }, { status: 503 })
    : Response.json({ auth: { signedIn: false }, sites: [] }));
  await assert.rejects(api.workspace(), error => error.status === 503);
  assert.equal((await api.workspace()).auth.signedIn, false); assert.equal(calls, 2);
});

test('production workspace verifies one Clerk session/user and queries PostgreSQL policy/sites locally', async t => {
  const settings = { AUTH_MODE: 'clerk', CLERK_SECRET_KEY: 'synthetic-only', CLERK_PUBLISHABLE_KEY: 'synthetic-only',
    AUTH_TRUSTED_ORIGINS: 'https://studio.example.test' };
  const previous = Object.fromEntries(Object.keys(settings).map(key => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
  t.mock.method(globalThis, 'fetch', () => assert.fail('unexpected Worker/D1 request'));
  const counts = { verify: 0, session: 0, user: 0, policy: 0, sites: 0 };
  const clerk = { authenticateRequest: async () => { counts.verify++; return { toAuth: () => ({ userId: 'synthetic', sessionId: 'session' }) }; },
    sessions: { getSession: async () => { counts.session++; return { status: 'active', userId: 'synthetic', expireAt: Date.now() + 60000 }; } },
    users: { getUser: async () => { counts.user++; return { id: 'synthetic', banned: false, locked: false, primaryEmailAddressId: 'e',
      emailAddresses: [{ id: 'e', emailAddress: 'synthetic@example.test', verification: { status: 'verified' } }],
      externalAccounts: [{ provider: 'oauth_google', emailAddress: 'synthetic@example.test' }] }; } } };
  const load = tsLoader({ '@clerk/nextjs/server': { clerkClient: async () => clerk },
    './demo-auth': { ownerId: () => assert.fail('Clerk fallback'), demoEnabled: () => false },
    './db': { db: () => ({ query: async (sql, values) => {
      if (sql.startsWith('INSERT INTO users')) { counts.policy++; return { rowCount: 1, rows: [{ id: 'synthetic', role: 'employee' }] }; }
      counts.sites++; assert.match(sql, /s.owner_id=\$1 OR \$2='admin'/); assert.deepEqual(values, ['synthetic', 'employee']);
      return { rowCount: 0, rows: [] };
    } }) } });
  const { readStudioWorkspace } = load(new URL('../src/lib/studio-workspace.ts', import.meta.url));
  const result = await readStudioWorkspace(new Request('https://studio.example.test/api/workspace', { headers: { Host: 'studio.example.test' } }));
  assert.equal(result.auth.signedIn, true);
  assert.deepEqual(counts, { verify: 1, session: 1, user: 1, policy: 1, sites: 1 });
});

test('Studio bootstrap uses one workspace read; no auth/list fallback or idle polling', async () => {
  const effects = [], setters = [], calls = [];
  const client = { workspace: async () => { calls.push('workspace'); return { auth: { signedIn: true, available: true }, sites: [] }; },
    auth: () => assert.fail('duplicate auth'), listSites: () => assert.fail('duplicate listing') };
  const { useStudio } = tsLoader({ react: {
    useEffect: effect => effects.push(effect),
    useState: initial => [initial, value => setters.push(value)],
  }, 'next/navigation': { useRouter: () => ({}) } })(new URL('../src/features/studio/use-studio.ts', import.meta.url));
  useStudio(client);
  const cleanup = effects[0]();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['workspace']);
  assert.ok(setters.includes('signed-in'));
  cleanup();
});
