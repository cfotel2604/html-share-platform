import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { assertPostgresBackend } from '../scripts/metadata-backend.mjs';
import { tsLoader } from './helpers/load-ts.mjs';

test('unsupported metadata backends cannot start or create a PostgreSQL/Clerk client', t => {
  const previous = process.env.METADATA_BACKEND;
  t.after(() => { if (previous === undefined) delete process.env.METADATA_BACKEND; else process.env.METADATA_BACKEND = previous; });
  assert.doesNotThrow(() => assertPostgresBackend({}));
  assert.doesNotThrow(() => assertPostgresBackend({ METADATA_BACKEND: 'postgres' }));
  for (const value of ['cloudflare', 'd1', '', 'unknown']) {
    process.env.METADATA_BACKEND = value;
    const load = tsLoader({ pg: { Pool: class { constructor() { assert.fail('pool constructed'); } } } });
    assert.throws(() => load(new URL('../src/instrumentation.ts', import.meta.url)).register(), /must be postgres/);
    assert.throws(() => load(new URL('../src/lib/db.ts', import.meta.url)).db(), /must be postgres/);
    assert.throws(() => load(new URL('../src/lib/auth-config.ts', import.meta.url)).clerkAvailable(), /must be postgres/);
  }
});

test('readiness uses only PostgreSQL SELECT 1; backend rejection/provider failure are local 503', async t => {
  const previous = process.env.METADATA_BACKEND;
  t.after(() => { if (previous === undefined) delete process.env.METADATA_BACKEND; else process.env.METADATA_BACKEND = previous; });
  t.mock.method(globalThis, 'fetch', () => assert.fail('readiness called external network'));
  let connected = 0, statements = [], fail = false;
  const { GET } = tsLoader({ pg: { Client: class {
    async connect() { connected++; if (fail) throw new Error('synthetic failure'); }
    async query(sql) { statements.push(sql); }
    async end() {}
  } } })(new URL('../src/app/api/health/ready/route.ts', import.meta.url));
  process.env.METADATA_BACKEND = 'postgres';
  assert.equal((await GET()).status, 200);
  assert.deepEqual(statements, ['SELECT 1']);
  fail = true;
  assert.equal((await GET()).status, 503);
  process.env.METADATA_BACKEND = 'cloudflare';
  assert.equal((await GET()).status, 503);
  assert.equal(connected, 2);
});

test('administration source has no Worker bridge, D1 REST writer or session mint/refresh path', async () => {
  async function files(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map(entry => entry.isDirectory() ? files(new URL(entry.name + '/', directory))
      : [new URL(entry.name, directory)]))).flat();
  }
  const paths = await files(new URL('../src/', import.meta.url));
  for (const path of paths.filter(path => /\.[cm]?[jt]sx?$/.test(path.pathname))) {
    const source = await readFile(path, 'utf8');
    assert.doesNotMatch(source, /CLOUDFLARE_(?:API|SERVICE|D1)|workers\.dev|api\.cloudflare\.com|\.withSession\(|refreshSession\(|getToken\(|createSessionToken\(/, path.pathname);
  }
});
