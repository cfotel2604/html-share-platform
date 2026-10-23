import assert from 'node:assert/strict';
import { test,before,after } from 'node:test';
import { harness } from './harness.mjs';
import { finalize } from '../../cloudflare/shared/metadata.mjs';
import { serve } from '../../cloudflare/shared/serve.mjs';
let h;
before(async()=>{h=await harness();});
after(async()=>{await h?.close();});
test('public canonical, direct/nested sandbox, asset allowlist and strict routes',async()=>{
  const f=await h.publish();
  const url=h.vars.PUBLIC_ORIGIN+'/'+f.code;
  assert.equal((await h.publicWorker.fetch(url,{redirect:'manual'})).status,308);
  for(const path of ['/','/nested/page.htm']) {
    const res=await h.publicWorker.fetch(url+path);assert.equal(res.status,200);
    assert.match(res.headers.get('Content-Security-Policy'),/^sandbox allow-scripts;/);
    assert.ok(!res.headers.get('Content-Security-Policy').includes('allow-same-origin'));
    assert.equal(res.headers.get('Cache-Control'),'no-store');assert.equal(res.headers.get('Set-Cookie'),null);
  }
  assert.equal((await h.publicWorker.fetch(url+'/assets/data.json')).headers.get('Access-Control-Allow-Origin'),'*');
  for(const path of ['/test.svg','/test.xhtml','/test.pdf','/absent','/assets%2fdata.json']) assert.equal((await h.publicWorker.fetch(url+path)).status,404);
  assert.equal((await h.publicWorker.fetch(h.vars.PUBLIC_ORIGIN+'/assets/data.json')).status,404);
  assert.equal((await h.publicWorker.fetch(url+'/',{method:'POST'})).status,405);
  assert.equal((await h.publicWorker.fetch('https://unapproved.test/'+f.code+'/')).status,404);
  assert.equal((await h.publicWorker.fetch(url+'/',{method:'HEAD'})).headers.get('Content-Length'),String(f.assets[0].size));
});
test('ownership denied before intent and policy revocation blocks finalize batch',async()=>{
  const f=await h.publish();
  assert.equal((await h.api('/v1/uploads',{actor:'b',method:'POST',body:{name:'denied',siteId:f.site.id}})).status,404);
  const pending=await h.upload(f.site.id);
  await h.db.prepare("UPDATE auth_allowlist SET status='disabled' WHERE email='a@example.test'").run();
  assert.equal((await h.api('/v1/uploads/'+pending.intent.id+'/finalize',{method:'POST',body:{assets:pending.assets}})).status,403);
  assert.equal((await h.db.prepare('SELECT active_version_id FROM sites WHERE id=?').bind(f.site.id).first()).active_version_id,f.site.active_version_id);
  await h.db.prepare("UPDATE auth_allowlist SET status='active' WHERE email='a@example.test'").run();
});
test('upload-unpublish CAS guard rolls back all finalize writes',async()=>{
  const f=await h.publish(),pending=await h.upload(f.site.id);
  assert.equal((await h.api('/v1/sites/'+f.site.id,{method:'PATCH',body:{published:false}})).status,200);
  const final=await h.api('/v1/uploads/'+pending.intent.id+'/finalize',{method:'POST',body:{assets:pending.assets}});
  assert.equal(final.status,409);
  assert.equal(await h.db.prepare('SELECT id FROM site_versions WHERE id=?').bind(pending.intent.versionId).first(),null);
  assert.equal((await h.publicWorker.fetch(h.vars.PUBLIC_ORIGIN+'/'+f.code+'/')).status,404);
});
test('revocation denies content, tombstones persist, update/publish do not resurrect',async()=>{
  const f=await h.publish();
  assert.equal((await h.api('/v1/sites/'+f.site.id+'/share',{method:'DELETE'})).status,200);
  assert.equal((await h.publicWorker.fetch(h.vars.PUBLIC_ORIGIN+'/'+f.code+'/')).status,404);
  await h.publish(f.site.id);
  const codes=await h.db.prepare('SELECT * FROM site_share_links WHERE site_id=?').bind(f.site.id).all();
  assert.equal(codes.results.length,1);assert.ok(codes.results[0].revoked_at);
  const reissue=await (await h.api('/v1/sites/'+f.site.id+'/share',{method:'POST'})).json();
  assert.notEqual(reissue.share_code,f.code);
  assert.equal((await h.publicWorker.fetch(reissue.share_url)).status,200);
});
test('idempotent finalize survives lost acknowledgement; cleanup cannot delete committed objects',async()=>{
  const pending=await h.upload(),key=crypto.randomUUID();
  await h.api('/v1/uploads/'+pending.intent.id+'/finalize',{method:'POST',key,body:{assets:pending.assets}}); // discard acknowledgement
  const retry=await h.api('/v1/uploads/'+pending.intent.id+'/finalize',{method:'POST',key,body:{assets:pending.assets}});
  assert.equal(retry.status,200);
  assert.equal((await h.api('/v1/receipts/'+key)).status,200);
  assert.equal((await h.api('/v1/uploads/'+pending.intent.id+'/abort',{method:'POST'})).status,409);
  assert.equal((await h.api('/v1/uploads/'+pending.intent.id+'/cleanup',{method:'POST'})).status,409);
  assert.ok(await h.bucket.head(pending.intent.storagePrefix+'/index.html'));
  assert.equal((await h.api('/v1/uploads/'+pending.intent.id+'/finalize',{method:'POST',key,body:{assets:[]}})).status,409);
});
test('audit failure rolls back pointer and receipt; safe abort cleanup deletes only private orphan prefix',async()=>{
  const pending=await h.upload(),key=crypto.randomUUID();
  await h.db.prepare("CREATE TRIGGER fail_audit BEFORE INSERT ON audit_events WHEN NEW.action LIKE 'upload.finalize:%' BEGIN SELECT RAISE(ABORT,'synthetic audit failure'); END").run();
  assert.equal((await h.api('/v1/uploads/'+pending.intent.id+'/finalize',{method:'POST',key,body:{assets:pending.assets}})).status,409);
  assert.equal(await h.db.prepare('SELECT id FROM site_versions WHERE id=?').bind(pending.intent.versionId).first(),null);
  assert.equal((await h.api('/v1/receipts/'+key)).status,404);
  await h.db.prepare('DROP TRIGGER fail_audit').run();
  assert.equal((await h.api('/v1/uploads/'+pending.intent.id+'/cleanup',{method:'POST'})).status,409);
  assert.equal((await h.api('/v1/uploads/'+pending.intent.id+'/abort',{method:'POST'})).status,200);
  assert.equal((await h.api('/v1/uploads/'+pending.intent.id+'/cleanup',{method:'POST'})).status,200);
  assert.equal(await h.bucket.head(pending.intent.storagePrefix+'/index.html'),null);
});
test('preview is separate, hash-only, immutable version scoped, actor policy and expiry checked',async()=>{
  const f=await h.publish(),key=crypto.randomUUID();
  await h.api('/v1/sites/'+f.site.id,{method:'PATCH',body:{published:false}});
  const grant=await (await h.api('/v1/sites/'+f.site.id+'/preview',{method:'POST',key})).json();
  assert.equal(new URL(grant.url).origin,h.vars.PREVIEW_ORIGIN);
  assert.equal((await h.previewWorker.fetch(grant.url)).status,200);
  const saved=await h.db.prepare('SELECT response_json FROM mutation_receipts WHERE key=?').bind(key).first();
  assert.ok(!saved.response_json.includes(new URL(grant.url).pathname.slice(1,-1)));
  const retry=await (await h.api('/v1/sites/'+f.site.id+'/preview',{method:'POST',key})).json();assert.equal(retry.url,grant.url);
  await h.db.prepare("UPDATE users SET status='disabled' WHERE id='a'").run();
  assert.equal((await h.previewWorker.fetch(grant.url)).status,404);
  await h.db.prepare("UPDATE users SET status='active' WHERE id='a'").run();
  await h.db.prepare("UPDATE preview_grants SET expires_at='2000-01-01T00:00:00.000Z'").run();
  assert.equal((await h.previewWorker.fetch(grant.url)).status,404);
});
test('tampered/missing objects fail closed without stale or raw R2 fallback',async()=>{
  const f=await h.publish(),url=h.vars.PUBLIC_ORIGIN+'/'+f.code+'/';
  await h.bucket.put(f.intent.storagePrefix+'/index.html','tampered');
  assert.equal((await h.publicWorker.fetch(url)).status,503);
  await h.bucket.delete(f.intent.storagePrefix+'/index.html');
  assert.equal((await h.publicWorker.fetch(url)).status,503);
  assert.equal((await h.publicWorker.fetch(h.vars.PUBLIC_ORIGIN+'/'+f.intent.storagePrefix+'/index.html')).status,404);
});
test('concurrent rotation keeps one active mapping; provider failures are bounded and no auth cookies required',async()=>{
  const f=await h.publish();
  const replies=await Promise.all([1,2].map(()=>h.api('/v1/sites/'+f.site.id+'/share',{method:'POST'})));
  assert.ok(replies.every(r=>[200,409].includes(r.status)));
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM site_share_links WHERE site_id=? AND revoked_at IS NULL').bind(f.site.id).first()).n,1);
  const res=await (await h.mf.getWorker('api')).fetch(h.vars.API_ORIGIN+'/v1/sites');
  assert.equal(res.status,401);assert.equal(res.headers.get('Access-Control-Allow-Origin'),null);
});
test('policy revoked after preflight but during R2 verification fails the in-batch guard',async()=>{
  const f=await h.publish(),pending=await h.upload(f.site.id);let changed=false;
  const env={...h.vars,DB:h.db,ASSETS:{head:async key=>{
    const obj=await h.bucket.head(key);
    if(!changed) {changed=true;await h.db.prepare("UPDATE auth_allowlist SET status='disabled' WHERE email='a@example.test'").run();}
    return obj;
  }}};
  await assert.rejects(()=>finalize(env,{id:'a'},crypto.randomUUID(),pending.intent.id,{assets:pending.assets}),e=>e.status===409);
  assert.equal(await h.db.prepare('SELECT id FROM site_versions WHERE id=?').bind(pending.intent.versionId).first(),null);
  await h.db.prepare("UPDATE auth_allowlist SET status='active' WHERE email='a@example.test'").run();
});
test('serving returns a stream without buffering bytes; DB outage fails closed',async()=>{
  let reads=0;
  const env={...h.vars,DB:{prepare:()=>({bind:()=>({first:async()=>({storage_prefix:'a'.repeat(32)+'/'+crypto.randomUUID(),size:90*1024*1024,etag:'pinned',type:'text/html; charset=utf-8'})})})},ASSETS:{get:async()=>({size:90*1024*1024,etag:'pinned',body:new ReadableStream({pull(c){reads++;c.enqueue(new Uint8Array(1024));}},{highWaterMark:0})})}};
  const res=await serve(new Request(h.vars.PUBLIC_ORIGIN+'/AbCdEf1234/'),env);
  assert.equal(res.status,200);assert.equal(reads,0);
  const reader=res.body.getReader();await reader.read();assert.equal(reads,1);await reader.cancel();
  env.DB.prepare=()=>{throw new Error('synthetic DB outage');};
  assert.equal((await serve(new Request(h.vars.PUBLIC_ORIGIN+'/AbCdEf1234/'),env)).status,503);
});
