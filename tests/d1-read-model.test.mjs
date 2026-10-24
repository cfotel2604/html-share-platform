import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { after, before, test } from 'node:test';
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from 'miniflare';

const root = new URL('../cloudflare/read-model/', import.meta.url);
const migration = await readFile(new URL('migrations/0004_public_read_model.sql', root), 'utf8');
const project = await readFile(new URL('queries/project.sql', root), 'utf8');
const resolve = await readFile(new URL('queries/resolve.sql', root), 'utf8');
const legacyRoot = new URL('fixtures/d1-legacy/', import.meta.url);
const legacy = await Promise.all((await readdir(legacyRoot)).filter(name => name.endsWith('.sql')).sort()
  .map(name => readFile(new URL(name, legacyRoot), 'utf8')));
const code = 'AbCd123456', site = 'a'.repeat(32), version = '11111111-1111-4111-8111-111111111111';
const updatedAt = '2026-10-24T00:00:00.000Z';
const entry = (path = 'index.html') => ({ path, r2_key: `${site}/${version}/${path}`, size: 10, etag: 'synthetic-etag' });
const event = (revision, status = 'published', overrides = {}) => {
  const data = { share_code: code, site_id: site, status,
    active_version: status === 'published' ? version : null,
    manifest: status === 'published' ? JSON.stringify([entry()]) : '[]',
    projection_version: revision, updated_at: updatedAt, ...overrides };
  return Object.values(data);
};

// Parse statement boundaries with SQLite itself: splitting on ';' corrupts triggers.
function statements(sql) {
  const parser = new DatabaseSync(':memory:');
  const result = [];
  let pending = '';
  try {
    for (const line of sql.split('\n')) {
      pending += line + '\n';
      if (!line.trimEnd().endsWith(';')) continue;
      try { parser.exec(pending); }
      catch (error) {
        if (error.message.includes('incomplete input')) continue;
        throw error;
      }
      result.push(pending);
      pending = '';
    }
    assert.equal(pending.trim(), '', 'migration must end at a complete SQL statement');
    return result;
  } finally { parser.close(); }
}

let emulator, fresh, upgraded;
before(async () => {
  emulator = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: 'export default { fetch() { return new Response(null, { status: 404 }); } };',
    compatibilityDate: '2026-07-29', inspectorPort: 0, log: new Log(LogLevel.NONE),
    d1Databases: { FRESH: 'read-model-fresh', UPGRADED: 'read-model-upgraded' },
  }));
  fresh = await emulator.getD1Database('FRESH');
  upgraded = await emulator.getD1Database('UPGRADED');
  for (const statement of statements(legacy.join('\n'))) await upgraded.prepare(statement).run();
  await upgraded.batch([
    upgraded.prepare('INSERT INTO auth_allowlist VALUES (?, ?, ?)').bind('synthetic@example.test', 'employee', 'active'),
    upgraded.prepare('INSERT INTO users VALUES (?, ?, ?, ?)').bind('synthetic', 'clerk:synthetic', 'synthetic@example.test', 'active'),
    upgraded.prepare('INSERT INTO sites VALUES (?, ?, ?, ?, ?, ?, ?)').bind(site, 'synthetic', 'Synthetic', 'draft', null, 1, updatedAt),
    upgraded.prepare('INSERT INTO site_share_links VALUES (?, ?, ?)').bind('Legacy1234', site, updatedAt),
  ]);
});
after(async () => { await emulator?.dispose(); });

test('0004 applies to empty D1 and adds only the seven public fields', async () => {
  for (const statement of statements(migration)) await fresh.prepare(statement).run();
  const { results: columns } = await fresh.prepare('PRAGMA table_info(public_read_model)').all();
  assert.deepEqual(columns.map(column => column.name), [
    'share_code', 'site_id', 'status', 'active_version', 'manifest', 'projection_version', 'updated_at',
  ]);
  const { results: tables } = await fresh.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'").all();
  assert.deepEqual(tables.map(table => table.name), ['public_read_model']);
  await assert.rejects(fresh.prepare(migration).run()); // Never conceal an accidental re-application.
});

test('0004 preserves all legacy pilot tables, indexes, triggers and synthetic rows', async () => {
  async function snapshot() {
    const { results: schema } = await upgraded.prepare("SELECT type, name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY type, name").all();
    const rows = {};
    for (const table of schema.filter(item => item.type === 'table')) {
      rows[table.name] = (await upgraded.prepare(`SELECT * FROM "${table.name}" ORDER BY rowid`).all()).results;
    }
    return { schema, rows };
  }
  const old = await snapshot();
  for (const statement of statements(migration)) await upgraded.prepare(statement).run();
  const current = await snapshot();
  assert.deepEqual(current.schema.filter(item => !item.name.startsWith('public_read_model')), old.schema);
  delete current.rows.public_read_model;
  assert.deepEqual(current.rows, old.rows);
  assert.equal(await upgraded.prepare('SELECT count(*) AS total FROM public_read_model').first('total'), 0);
});

for (const database of ['fresh', 'upgraded']) {
  test(`${database}: exact-case indexed lookup and monotonic publish/unpublish/revoke`, async () => {
    const db = database === 'fresh' ? fresh : upgraded;
    const apply = (...args) => db.prepare(project).bind(...event(...args)).run();
    const lookup = lookupCode => db.prepare(resolve).bind(lookupCode).first();
    await apply(1);
    assert.equal((await lookup(code)).active_version, version);
    assert.equal(await lookup(code.toLowerCase()), null);
    assert.equal(await lookup('missing123'), null);
    assert.equal(await lookup(site), null);
    const { results: plan } = await db.prepare('EXPLAIN QUERY PLAN ' + resolve).bind(code).all();
    assert.match(JSON.stringify(plan), /SEARCH .*public_read_model.*INDEX/);
    await apply(3, 'unpublished');
    assert.equal(await lookup(code), null);
    await apply(2);
    assert.equal(await lookup(code), null);
    await apply(4);
    assert.equal((await lookup(code)).projection_version, 4);
    const changedVersion = '22222222-2222-4222-8222-222222222222';
    await apply(5, 'published', { active_version: changedVersion,
      manifest: JSON.stringify([{ ...entry(), r2_key: `${site}/${changedVersion}/index.html`, etag: 'next-etag' }]) });
    assert.equal((await lookup(code)).active_version, changedVersion);
    await apply(7, 'revoked');
    for (const revision of [1, 5, 6, 7]) await apply(revision);
    const tombstone = await db.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(code).first();
    await apply(8); // Even an incorrectly newer publish cannot reuse a revoked code.
    await apply(8, 'unpublished');
    assert.deepEqual(await db.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(code).first(), tombstone);
    assert.equal(tombstone.projection_version, 7);
    assert.equal(tombstone.active_version, null);
    assert.equal(tombstone.manifest, '[]');
    assert.equal(await lookup(code), null);
    await apply(8, 'revoked');
    await apply(9, 'published', { share_code: 'New1234567' });
    assert.equal((await lookup('New1234567')).projection_version, 9);
    assert.equal(await lookup(code), null);
  });
}

test('duplicate delivery is a byte-for-byte no-op; share codes cannot change owners', async () => {
  const values = event(20, 'published', { share_code: 'Noop123456' });
  await fresh.prepare(project).bind(...values).run();
  const before = await fresh.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(values[0]).first();
  await fresh.prepare(project).bind(...event(20, 'unpublished', { share_code: values[0] })).run();
  await fresh.prepare(project).bind(...event(21, 'published', { share_code: values[0], site_id: 'b'.repeat(32) })).run();
  assert.deepEqual(await fresh.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(values[0]).first(), before);
});

test('schema guards reject deletion, identity changes, resurrection and stale direct updates', async () => {
  const lookup = () => fresh.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(code).first();
  const tombstone = await lookup();
  await fresh.prepare("UPDATE public_read_model SET status='published', active_version=?, manifest=?, projection_version=1 WHERE share_code=?")
    .bind(version, JSON.stringify([entry()]), code).run();
  assert.deepEqual(await lookup(), tombstone);
  for (const sql of [
    "DELETE FROM public_read_model WHERE share_code=?",
    "UPDATE public_read_model SET share_code='Hijack1234', projection_version=99 WHERE share_code=?",
    "UPDATE public_read_model SET site_id='bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', projection_version=99 WHERE share_code=?",
    "UPDATE public_read_model SET status='published', active_version='other', manifest='[]', projection_version=99 WHERE share_code=?",
  ]) await assert.rejects(fresh.prepare(sql).bind(code).run());
  assert.deepEqual(await lookup(), tombstone);
});

test('manifest and column constraints reject management fields and malformed public data', async () => {
  const bad = [
    { share_code: 'short' }, { share_code: 'AbCd12345_' }, { site_id: 'G'.repeat(32) },
    { status: 'draft' }, { active_version: null }, { projection_version: 0 },
    { projection_version: 1.5 }, { projection_version: 9007199254740992 }, { updated_at: 'yesterday' },
    { manifest: '{}' }, { manifest: 'null' }, { manifest: '[' }, { manifest: '[]' },
    { manifest: JSON.stringify([null]) }, { manifest: JSON.stringify(['index.html']) },
    { manifest: JSON.stringify([{ ...entry(), email: 'synthetic@example.test' }]) },
    { manifest: JSON.stringify([{ ...entry(), etag: null }]) },
    { manifest: JSON.stringify([{ ...entry(), size: -1 }]) },
    { manifest: JSON.stringify([{ ...entry(), size: '10' }]) },
    { manifest: JSON.stringify([{ ...entry(), size: 1.5 }]) },
    { manifest: JSON.stringify([{ ...entry(), r2_key: '' }]) },
    { manifest: JSON.stringify([entry('other.html')]) },
    { manifest: JSON.stringify([entry(), entry()]) },
    { manifest: JSON.stringify([entry(), { ...entry('other.html'), size: 104857600 }]) },
    { status: 'revoked', active_version: version },
  ];
  for (const override of bad) {
    await assert.rejects(fresh.prepare(project).bind(...event(1, 'published', { share_code: 'Invalid123', ...override })).run());
  }
  await assert.rejects(fresh.prepare('INSERT INTO public_read_model(email) VALUES (?)').bind('synthetic@example.test').run());
});

test('500-file manifest fits a single row; 501 files and extra metadata on update fail', async () => {
  const assets = [entry(), ...Array.from({ length: 499 }, (_, i) => entry(`assets/${i}.css`))];
  const values = event(1, 'published', { share_code: 'Large12345', manifest: JSON.stringify(assets) });
  await fresh.prepare(project).bind(...values).run();
  assert.equal(JSON.parse((await fresh.prepare(resolve).bind(values[0]).first()).manifest).length, 500);
  assets.push(entry('assets/overflow.css'));
  await assert.rejects(fresh.prepare(project).bind(...event(2, 'published', { share_code: values[0], manifest: JSON.stringify(assets) })).run());
  await assert.rejects(fresh.prepare(project).bind(...event(2, 'published', { share_code: values[0],
    manifest: JSON.stringify([{ ...entry(), audit: { actor: 'synthetic' } }]) })).run());
  assert.equal((await fresh.prepare(resolve).bind(values[0]).first()).projection_version, 1);
});
