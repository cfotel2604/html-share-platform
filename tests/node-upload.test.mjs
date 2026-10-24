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
  let puts = 0, gets = 0, manifest, inFlight = 0, maxInFlight = 0;
  globalThis.__htmlShareS3 = { send: async command => {
    const input = command.input;
    if (command.constructor.name === 'HeadBucketCommand') return {};
    if (command.constructor.name === 'PutObjectCommand') {
      assert.equal(input.IfNoneMatch, '*'); assert.ok(!objects.has(input.Key)); puts++;
      maxInFlight=Math.max(maxInFlight,++inFlight);
      await new Promise(resolve=>setTimeout(resolve,puts%3));
      const etag = '"' + createHash('md5').update(input.Body).digest('hex') + '"';
      objects.set(input.Key, { body: input.Body, etag }); return { ETag: etag };
    }
    assert.equal(command.constructor.name, 'GetObjectCommand'); gets++;
    const object = objects.get(input.Key); assert.equal(input.IfMatch, object.etag);
    await new Promise(resolve=>setTimeout(resolve,gets%3));inFlight--;
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
  assert.ok(maxInFlight>1 && maxInFlight<=6); assert.equal(inFlight,0);
  assert.deepEqual(manifest.map(x=>x.path),entries.map(x=>x.name));
  assert.equal(queries.at(-1), 'COMMIT');
  for (const asset of manifest) { assert.match(asset.sha256, /^[a-f0-9]{64}$/); assert.match(asset.etag, /^[a-f0-9]{32}$/); }
});

test('failure drains late writes/readbacks before rollback and cleans only acknowledged PUTs',async t=>{
  const failure=new Error('synthetic readback failure'),latePutError=new Error('synthetic lost PUT acknowledgment');
  let releasePeers,reportFailure;
  const peers=new Promise(resolve=>{releasePeers=resolve;}),reported=new Promise(resolve=>{reportFailure=resolve;});
  const calls=[],started=[],confirmed=[],unconfirmed=[],objects=new Set();let active=0,cleaned;
  t.mock.method(console,'warn',()=>{});
  const client={query:async sql=>{
    calls.push(sql);
    if(sql==='ROLLBACK')assert.equal(active,0,'rollback before draining transfers');
    return {rowCount:1,rows:[]};
  },release(){}};
  const assets=Array.from({length:12},(_,i)=>({path:i===0?'index.html':`file-${i}.txt`,type:i===0?'text/html':'text/plain',body:Buffer.from('synthetic')}));
  const load=tsLoader({
    './db':{db:()=>({connect:async()=>client})},'./auth-policy':{lockActor:async(_client,actor)=>actor},
    './upload':{parseSite:async()=>assets,fingerprint:()=> 'synthetic'},
    './storage':{ensureBucket:async()=>{},storeFile:async key=>{
      const index=started.length;started.push(key);active++;
      if(index>0)await peers;
      objects.add(key);
      if(index===5){unconfirmed.push(key);active--;throw latePutError;}
      confirmed.push(key);return 'etag';
    },readbackFile:async key=>{
      if(key.endsWith('/index.html')){active--;reportFailure();throw failure;}
      await Promise.resolve();active--;return 'etag';
    },removeFiles:async keys=>{
      assert.equal(active,0,'cleanup while PUT/readback still running');cleaned=[...keys];
      for(const key of keys)objects.delete(key);
    }},
  });
  const ops=load(new URL('../src/lib/site-ops.ts',import.meta.url));
  const upload=ops.uploadVersion({id:'owner',role:'employee',mode:'clerk'},new File(['fixture'],'fixture.zip'),'Fixture','a'.repeat(32));
  const rejected=assert.rejects(upload,error=>error===failure);
  await reported;await new Promise(resolve=>setImmediate(resolve));
  assert.ok(started.length>1 && started.length<=6);assert.equal(calls.includes('ROLLBACK'),false);assert.equal(cleaned,undefined);
  releasePeers();await rejected;
  assert.equal(started.length,6,'new transfers scheduled after first failure');
  assert.equal(calls.includes('COMMIT'),false);assert.ok(!calls.some(sql=>sql.startsWith('UPDATE sites')));
  assert.deepEqual(new Set(cleaned),new Set(confirmed));assert.deepEqual(objects,new Set(unconfirmed));
  await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(objects,new Set(unconfirmed),'a late write resurrected a cleaned object');
});
