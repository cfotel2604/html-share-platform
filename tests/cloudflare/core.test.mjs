import assert from 'node:assert/strict';
import { test,before,after } from 'node:test';
import { harness } from './harness.mjs';
import { finalize } from '../../cloudflare/shared/metadata.mjs';
import { serve } from '../../cloudflare/shared/serve.mjs';
import { reconcileExpired } from '../../cloudflare/shared/reconcile.mjs';
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
  const env={...h.vars,DB:h.db,ASSETS:{list:async options=>{
    const obj=await h.bucket.list(options);
    if(!changed) {changed=true;await h.db.prepare("UPDATE auth_allowlist SET status='disabled' WHERE email='a@example.test'").run();}
    return obj;
  }}};
  await assert.rejects(()=>finalize(env,{id:'a'},crypto.randomUUID(),pending.intent.id,{assets:pending.assets}),e=>e.status===409);
  assert.equal(await h.db.prepare('SELECT id FROM site_versions WHERE id=?').bind(pending.intent.versionId).first(),null);
  await h.db.prepare("UPDATE auth_allowlist SET status='active' WHERE email='a@example.test'").run();
});

test('500-file finalize verifies a complete immutable object set in one provider metadata call',async()=>{
  const files={'index.html':'<p>synthetic quota</p>',...Object.fromEntries(Array.from({length:499},(_,i)=>['assets/'+i+'.js','/* synthetic */']))};
  const pending=await h.upload(undefined,'a',files);let calls=0;
  const env={...h.vars,DB:h.db,ASSETS:{list:async options=>{
    calls++;assert.equal(options.prefix,pending.intent.storagePrefix+'/');return h.bucket.list(options);
  },head:async()=>{throw new Error('Sequential HEAD path forbidden');}}};
  const result=await finalize(env,{id:'a'},crypto.randomUUID(),pending.intent.id,{assets:pending.assets});
  assert.equal(result.fileCount,500);assert.equal(calls,1);
  assert.equal((await h.db.prepare('SELECT count(*) AS n FROM version_assets WHERE version_id=?').bind(pending.intent.versionId).first()).n,500);
});

test('incomplete, extra, duplicated or changed metadata never commits a version',async()=>{
  const original=await h.publish();
  for(const defect of ['truncated','missing','extra','duplicate','size','etag']) {
    const pending=await h.upload(original.site.id);
    const env={...h.vars,DB:h.db,ASSETS:{list:async options=>{
      const page=await h.bucket.list(options);
      if(defect==='truncated') return {...page,truncated:true,cursor:'synthetic'};
      if(defect==='missing') return {...page,objects:page.objects.slice(1)};
      if(defect==='extra') return {...page,objects:[...page.objects,{key:options.prefix+'unknown.js',size:0,etag:'extra'}]};
      if(defect==='duplicate') return {...page,objects:[page.objects[0],page.objects[0],...page.objects.slice(2)]};
      return {...page,objects:page.objects.map((obj,index)=>index?obj:{...obj,[defect]:defect==='size'?obj.size+1:'wrong'})};
    }}};
    await assert.rejects(()=>finalize(env,{id:'a'},crypto.randomUUID(),pending.intent.id,{assets:pending.assets}),e=>e.status===409,defect);
    assert.equal((await h.db.prepare('SELECT active_version_id FROM sites WHERE id=?').bind(original.site.id).first()).active_version_id,original.site.active_version_id);
    assert.equal(await h.db.prepare('SELECT id FROM site_versions WHERE id=?').bind(pending.intent.versionId).first(),null);
  }
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
test('expired intent reconciliation dry-run, durable retry and active/grant reference protection',async()=>{
  const active=await h.publish(),orphan=await h.upload();
  await h.db.prepare("UPDATE upload_intents SET expires_at='2000-01-01T00:00:00.000Z' WHERE id IN (?,?)").bind(active.intent.id,orphan.intent.id).run();
  const env={...h.vars,DB:h.db,ASSETS:h.bucket};
  const dry=await reconcileExpired(env);assert.ok(dry.candidates>=1);
  assert.ok(await h.bucket.head(orphan.intent.storagePrefix+'/index.html'));
  const applied=await reconcileExpired(env,{dryRun:false});assert.ok(applied.cleaned>=1);
  assert.equal(await h.bucket.head(orphan.intent.storagePrefix+'/index.html'),null);
  assert.ok(await h.bucket.head(active.intent.storagePrefix+'/index.html'));
  assert.equal((await h.db.prepare('SELECT cleanup_at FROM upload_intents WHERE id=?').bind(orphan.intent.id).first()).cleanup_at!==null,true);
  const failed=await h.upload();await h.db.prepare("UPDATE upload_intents SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").bind(failed.intent.id).run();
  const report=await reconcileExpired({...env,ASSETS:{list:async()=>{throw new Error('synthetic storage outage');}}},{dryRun:false});assert.ok(report.failed>=1);
  assert.equal((await h.db.prepare('SELECT state FROM upload_intents WHERE id=?').bind(failed.intent.id).first()).state,'aborted');
  assert.ok((await reconcileExpired(env,{dryRun:false})).cleaned>=1);
});
test('local indexed read probe reports latency and D1 rows without content or identifiers',async()=>{
  const f=await h.publish(),samples=[];let rows=0;
  const DB={prepare(sql){return {bind(...args){return {async first(){const result=await h.db.prepare(sql).bind(...args).all();rows+=result.meta.rows_read??0;return result.results[0]??null;}};}};}};
  for(let i=0;i<16;i++) {
    const start=performance.now();const res=await serve(new Request(h.vars.PUBLIC_ORIGIN+'/'+f.code+'/'),{...h.vars,DB,ASSETS:h.bucket});
    assert.equal(res.status,200);await res.body.cancel();samples.push(performance.now()-start);
  }
  samples.sort((a,b)=>a-b);assert.ok(samples.at(-1)<5000);assert.ok(rows<16*30);
  console.info(JSON.stringify({localReadProbe:{requests:16,p50ms:Math.round(samples[8]),p95ms:Math.round(samples[15]),rowsRead:rows}}));
});
test('soft-delete denies both public content and an existing private capability',async()=>{
  const f=await h.publish();
  const grant=await (await h.api('/v1/sites/'+f.site.id+'/preview',{method:'POST'})).json();
  const key=crypto.randomUUID();
  const response=await h.api('/v1/sites/'+f.site.id,{method:'PATCH',key,body:{deleted:true}});assert.equal(response.status,200);
  assert.equal((await h.publicWorker.fetch(h.vars.PUBLIC_ORIGIN+'/'+f.code+'/')).status,404);
  assert.equal((await h.previewWorker.fetch(grant.url)).status,404);
  assert.equal((await h.api('/v1/sites/'+f.site.id,{method:'PATCH',key,body:{deleted:true}})).status,200);
});
