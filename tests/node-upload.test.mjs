import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { tsLoader } from './helpers/load-ts.mjs';
import { zipBytes } from './helpers/zip.mjs';

test('Node validates and reads back all 500 ZIP files before PostgreSQL activation/commit with no Workers', async t => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('unexpected Worker/D1 request'));
  const old = globalThis.__htmlShareS3;
  t.after(() => { if (old) globalThis.__htmlShareS3 = old; else delete globalThis.__htmlShareS3; });
  const objects = new Map(), queries = [];
  let puts = 0, gets = 0, manifest;
  globalThis.__htmlShareS3 = { send: async command => {
    const input = command.input;
    if (command.constructor.name === 'HeadBucketCommand') return {};
    if (command.constructor.name === 'PutObjectCommand') {
      assert.equal(input.IfNoneMatch, '*'); assert.ok(!objects.has(input.Key)); puts++;
      const etag = '"' + createHash('md5').update(input.Body).digest('hex') + '"';
      objects.set(input.Key, { body: input.Body, etag }); return { ETag: etag };
    }
    assert.equal(command.constructor.name, 'GetObjectCommand'); gets++;
    const object = objects.get(input.Key); assert.equal(input.IfMatch, object.etag);
    return { ETag: object.etag, ContentLength: object.body.length, Body: Readable.from([object.body]) };
  } };
  const client = { query: async (sql, values) => {
    queries.push(sql);
    if (sql.startsWith('UPDATE site_versions')) { assert.equal(gets, 500); manifest = JSON.parse(values[1]); }
    if (sql.startsWith('UPDATE sites') || sql === 'COMMIT') assert.equal(manifest?.length, 500);
    return { rowCount: 1, rows: [] };
  }, release() {} };
  const ops = tsLoader({ './db': { db: () => ({ connect: async () => client }) },
    './auth-policy': { lockActor: async (_client, actor) => actor },
  })(new URL('../src/lib/site-ops.ts', import.meta.url));
  const entries = [{ name: 'index.html', body: '<p>synthetic</p>' },
    ...Array.from({ length: 499 }, (_, i) => ({ name: `assets/${i}.txt`, body: `asset ${i}` }))];
  const result = await ops.uploadVersion({ id: 'synthetic', role: 'employee', mode: 'clerk' },
    new File([zipBytes(entries)], 'synthetic.zip'), 'Synthetic');
  assert.equal(result.fileCount, 500); assert.equal(puts, 500); assert.equal(gets, 500);
  assert.equal(queries.at(-1), 'COMMIT');
  for (const asset of manifest) { assert.match(asset.sha256, /^[a-f0-9]{64}$/); assert.match(asset.etag, /^[a-f0-9]{32}$/); }
});
