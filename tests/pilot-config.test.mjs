import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { mkdtemp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { privateDirectory, desktopConfig, healthReady, readEnv, writeEnv } from '../scripts/lib/pilot-config.mjs';

test('pilot config refuses checkout-local private files including similarly named children', () => {
  assert.throws(() => privateDirectory(process.cwd()));
  assert.throws(() => privateDirectory(resolve('..private')));
  assert.throws(() => privateDirectory(undefined));
  assert.equal(privateDirectory(resolve('../pilot-private')), resolve('../pilot-private'));
});

test('Desktop key alias and allowlist are validated without changing operator values', () => {
  const values = { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_fixture', CLERK_SECRET_KEY: 'sk_test_fixture',
    HSP_PILOT_ADMIN_EMAIL: ' Admin@example.invalid ', HSP_PILOT_EMPLOYEE_EMAIL: 'employee@example.invalid' };
  assert.equal(desktopConfig(values).publishable, values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  assert.deepEqual(desktopConfig(values).emails, [{ email: 'admin@example.invalid', role: 'admin' }, { email: 'employee@example.invalid', role: 'employee' }]);
  assert.throws(() => desktopConfig({ ...values, CLERK_PUBLISHABLE_KEY: 'pk_test_other' }));
  assert.throws(() => desktopConfig({ ...values, CLERK_SECRET_KEY: 'sk_live_fixture' }));
  assert.throws(() => desktopConfig({ ...values, HSP_PILOT_EMPLOYEE_EMAIL: 'admin@example.invalid' }));
  assert.throws(() => desktopConfig({ ...values, HSP_PILOT_ADMIN_EMAIL: '' }));
  assert.equal(values.HSP_PILOT_ADMIN_EMAIL, ' Admin@example.invalid ');
});

test('health tolerates bounded deployment propagation and never exposes provider error bodies', async () => {
  let calls = 0, sleeps = 0;
  await healthReady('https://api.example.invalid', 'fixture-only', {
    fetcher: async () => ++calls < 3 ? new Response('private provider details', { status: 503 }) : Response.json({ status: 'ready' }),
    sleep: async () => { sleeps++; },
  });
  assert.equal(calls, 3); assert.equal(sleeps, 2);
  calls = 0;
  await assert.rejects(() => healthReady('https://api.example.invalid', 'fixture-only', {
    attempts: 2, fetcher: async () => { calls++; throw new Error('private provider details'); }, sleep: async () => {},
  }), error => error.message === 'Pilot Worker D1 health failed after bounded retries');
  assert.equal(calls, 2);
});

test('private dotenv serialization round trips supported values and rejects injection', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hsp-pilot-config-'));
  try {
    const path = join(directory, '.env.generated');
    const values = { EXAMPLE: 'text with spaces # literal', API_ORIGIN: 'https://api.example.invalid', PRIVATE_DIR: 'C:/private/pilot' };
    await writeEnv(path, values);
    assert.deepEqual({ ...await readEnv(path) }, values);
    await assert.rejects(() => writeEnv(path, { EXAMPLE: 'line1\nline2' }));
    await assert.rejects(() => writeEnv(path, { 'BAD\nKEY': 'value' }));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
