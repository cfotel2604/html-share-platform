import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { test } from 'node:test';
import { tsLoader } from './helpers/load-ts.mjs';

const body = Buffer.from('synthetic immutable content');
const etag = '"a123"';
const expected = { size: body.length, sha256: createHash('sha256').update(body).digest('hex'), etag };
const source = new URL('../src/lib/storage.ts', import.meta.url);
function fixture(t, send) {
  const old = globalThis.__htmlShareS3;
  globalThis.__htmlShareS3 = { send };
  t.after(() => { if (old) globalThis.__htmlShareS3 = old; else delete globalThis.__htmlShareS3; });
  return tsLoader()(source);
}
test('conditional create and streamed readback pin the acknowledged ETag', async t => {
  const calls = [];
  const storage = fixture(t, async command => {
    calls.push(command);
    return command.constructor.name === 'PutObjectCommand' ? { ETag: etag }
      : { ETag: etag, ContentLength: body.length, Body: Readable.from([body.subarray(0, 3), body.subarray(3)]) };
  });
  assert.equal(await storage.storeFile('synthetic/key', body, 'text/html'), etag);
  assert.equal(await storage.readbackFile('synthetic/key', expected), 'a123');
  assert.equal(calls[0].input.IfNoneMatch, '*');
  assert.equal(calls[1].input.IfMatch, etag);
});
for (const [reason, override] of [
  ['size', { ContentLength: body.length + 1 }], ['etag', { ETag: '"other"' }],
  ['truncated', { Body: () => Readable.from([body.subarray(1)]) }],
  ['oversized', { Body: () => Readable.from([body, Buffer.from('overflow')]) }],
  ['sha256', { Body: () => Readable.from([Buffer.alloc(body.length, 97)]) }],
  ['missing body', { Body: () => undefined }],
]) test(`readback fails closed on ${reason}`, async t => {
  let stream;
  const storage = fixture(t, async () => {
    stream = override.Body ? override.Body() : Readable.from([body]);
    return { ETag: etag, ContentLength: body.length, ...override, Body: stream };
  });
  await assert.rejects(storage.readbackFile('synthetic/key', expected));
  if (stream) assert.equal(stream.destroyed, true);
});
test('unacknowledged/malformed ETags cannot authorize a readback', async t => {
  let calls = 0;
  const storage = fixture(t, async () => { calls++; });
  for (const value of [undefined, '', 'unquoted', '"bad\r\nheader"']) {
    await assert.rejects(storage.readbackFile('synthetic/key', { ...expected, etag: value }));
  }
  assert.equal(calls, 0);
});
