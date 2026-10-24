import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { readFile,mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash,randomUUID } from 'node:crypto';
import { publicWorkerRuntime,PUBLIC_ORIGIN,STUDIO_ORIGIN } from './helpers/public-worker.mjs';
import { localPostgres,seedActor,nodeServices } from './helpers/public-projection.mjs';
import { projectOnce } from '../scripts/lib/public-projector.mjs';
import { zipBytes } from './helpers/zip.mjs';

const stamp='2026-10-24T00:00:00.000Z',version='11111111-1111-4111-8111-111111111111';
const sql=await readFile(new URL('../cloudflare/read-model/queries/resolve.sql',import.meta.url),'utf8');
const published='PubCd12345',unpublished='OffCd12345',revoked='RevCd12345',missing='NulCd12345';
const bodies=new Map([['index.html','<h1>Synthetic public</h1>'],['nested/page.html','<p>Synthetic nested</p>'],['assets/app.mjs','export const synthetic=1;'],['assets/style.css','body{color:blue}']]);
let runtime;
const url=(code=published,path='')=>PUBLIC_ORIGIN+'/'+code+'/'+path;
const secure=response=>{
  assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');assert.equal(response.headers.get('Set-Cookie'),null);
};
async function seed(code,status='published',changes={}){
  const site=createHash('md5').update(code).digest('hex'),manifest=[];
  if(status==='published')for(const [path,body] of bodies){
    const key=`${site}/${version}/${path}`;
    const object=await runtime.bucket.put(key,body,{httpMetadata:{contentType:'application/octet-stream',cacheControl:'public,max-age=31536000',contentDisposition:'attachment'}});
    manifest.push({path,r2_key:key,size:Buffer.byteLength(body),etag:object.etag});
  }
  const event={id:1,site_id:site,payload:[{share_code:code,site_id:site,status,active_version:status==='published'?version:null,manifest,projection_version:1,updated_at:stamp,...changes}]};
  await runtime.send(event);return event;
}
before(async()=>{runtime=await publicWorkerRuntime();await seed(published);await seed(unpublished,'unpublished');await seed(revoked,'revoked');});
after(async()=>{if(runtime){assert.equal(runtime.egress(),0,'Worker made an outbound/VM request');await runtime.close();}});

test('actual Worker bundle in workerd serves published root/nested/direct assets and controlled headers',async()=>{
  for(const [path,body] of bodies){
    const response=await runtime.fetch(url(published,path));assert.equal(response.status,200);assert.equal(await response.text(),body);secure(response);
    assert.equal(response.headers.get('Content-Disposition'),null);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'*');
    if(path.endsWith('.html')){assert.match(response.headers.get('Content-Security-Policy'),/^sandbox allow-scripts;/);assert.doesNotMatch(response.headers.get('Content-Security-Policy'),/allow-same-origin/);}
    if(path.endsWith('.mjs'))assert.equal(response.headers.get('Content-Type'),'text/javascript; charset=utf-8');
  }
  const root=await runtime.fetch(url());assert.equal(await root.text(),bodies.get('index.html'));
  const redirect=await runtime.fetch(PUBLIC_ORIGIN+'/'+published+'?ignored=1',{redirect:'manual'});
  assert.equal(redirect.status,308);assert.equal(redirect.headers.get('Location'),'/'+published+'/');secure(redirect);
});

test('real D1 published filter denies unpublished/revoked/missing/wrong-case and outside-manifest assets',async()=>{
  for(const code of [unpublished,revoked,missing,published.toLowerCase()]){
    const response=await runtime.fetch(url(code));assert.equal(response.status,404,code);secure(response);
  }
  const site=createHash('md5').update(published).digest('hex');await runtime.bucket.put(`${site}/${version}/unlisted.js`,'SYNTHETIC_NOT_PUBLIC');
  for(const path of ['unlisted.js','nested/','active.svg','../not-a-code/index.html']){
    const response=await runtime.fetch(url(published,path));assert.equal(response.status,404,path);secure(response);
  }
  for(const path of ['/api/sites','/preview/grant/','/'+site+'/'])assert.equal((await runtime.fetch(PUBLIC_ORIGIN+path)).status,404);
});

test('SQL injection strings return no row both at the route and the actual parameterized D1 contract',async()=>{
  for(const injection of ["' OR 1=1--",published+"' OR '1'='1",'AbCd123456;SELECT']){
    assert.equal((await runtime.fetch(url(encodeURIComponent(injection)))).status,404);
    assert.equal(await runtime.db.prepare(sql).bind(injection).first(),null);
  }
});

test('native adapter uses the exact single primary prepare/bind/first and only conditional get/head',async()=>{
  const calls={queries:0,get:0,head:0};
  const env={PUBLIC_ORIGIN,STUDIO_ORIGIN,PUBLIC_READ_MODEL:{prepare:query=>{calls.queries++;assert.equal(query,sql);return runtime.db.prepare(query);}},
    ASSETS:{get:(key,options)=>{calls.get++;assert.ok(key.endsWith('/index.html'));assert.deepEqual(Object.keys(options),['onlyIf']);return runtime.bucket.get(key,options);},
      head:key=>{calls.head++;return runtime.bucket.head(key);}}};
  for(const [code,path,method,expected] of [[published,'','GET',200],[published,'','HEAD',200],[unpublished,'','GET',404],[revoked,'','GET',404],[missing,'','GET',404],[published,'unlisted.js','GET',404]]){
    const start=calls.queries,gets=calls.get,heads=calls.head;
    const response=await runtime.worker.fetch(new Request(url(code,path),{method}),env);assert.equal(response.status,expected);
    assert.equal(calls.queries-start,1);await response.arrayBuffer();
    assert.equal(calls.get-gets,expected===200&&method==='GET'?1:0);assert.equal(calls.head-heads,expected===200&&method==='HEAD'?1:0);
  }
  const start=calls.queries;assert.equal((await runtime.worker.fetch(new Request(url(encodeURIComponent("' OR 1=1--"))),env)).status,404);assert.equal(calls.queries,start);
});

test('R2 missing/changed size/ETag, caller conditionals and provider failures cannot bypass a fresh lookup',async()=>{
  const changed=await seed('BadCd12345');const asset=changed.payload[0].manifest[0];
  await runtime.bucket.put(asset.r2_key,'X'.repeat(asset.size));
  for(const method of ['GET','HEAD']){const response=await runtime.fetch(url('BadCd12345'),{method});assert.equal(response.status,503);secure(response);await response.arrayBuffer();}
  await runtime.bucket.delete(asset.r2_key);assert.equal((await runtime.fetch(url('BadCd12345'))).status,503);
  const wrongSize=await seed('LenCd12345');wrongSize.id=2;wrongSize.payload[0].projection_version=2;wrongSize.payload[0].manifest[0].size++;
  await runtime.send(wrongSize);assert.equal((await runtime.fetch(url('LenCd12345'))).status,503);
  const head=await runtime.fetch(url(),{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  const full=await runtime.fetch(url(),{headers:{Range:'bytes=0-1','If-None-Match':'"synthetic"'}});
  assert.equal(full.status,200);assert.equal(await full.text(),bodies.get('index.html'));
  assert.equal((await runtime.fetch(url(revoked),{headers:{'If-None-Match':'"synthetic"'}})).status,404);
  const broken={PUBLIC_ORIGIN,STUDIO_ORIGIN,PUBLIC_READ_MODEL:{prepare(){throw new Error('SYNTHETIC_TOKEN_AND_SQL');}}};
  const failed=await runtime.worker.fetch(new Request(url()),broken);assert.equal(failed.status,503);assert.equal(await failed.text(),'Serving unavailable');
});

test('Node upload500 → transactional outbox → projector → Worker survives source shutdown/restart and lifecycle replay',async()=>{
  const dataDir=fileURLToPath(new URL('../tmp/worker-source-'+randomUUID(),import.meta.url));await mkdir(dataDir,{recursive:true});
  let source=await localPostgres({dataDir});
  const actor={...await seedActor(source.pool,'public-worker'),mode:'clerk'};
  let services=nodeServices(source.pool);
  const project=async()=>{await source.pool.query("UPDATE public_projection_control SET next_request_at='-infinity'");assert.equal((await projectOnce(source.pool,runtime.send)).state,'projected');};
  const copy=async()=>{const all=[...services.objects];for(let i=0;i<all.length;i+=16)await Promise.all(all.slice(i,i+16).map(async([key,object])=>{
    const existing=await runtime.bucket.head(key);if(existing){assert.equal('"'+existing.etag+'"',object.etag);return;}
    const stored=await runtime.bucket.put(key,object.body);assert.equal('"'+stored.etag+'"',object.etag);
  }));};
  try{
    const entries=[{name:'index.html',body:'<p>Synthetic500</p>'},...Array.from({length:499},(_,n)=>({name:`assets/${n}.txt`,body:`synthetic ${n}`}))];
    const site=await services.run(()=>services.ops.uploadVersion(actor,new File([zipBytes(entries)],'synthetic.zip'),'Synthetic500'));
    const code=(await source.pool.query('SELECT code FROM site_share_links WHERE site_id=$1',[site.id])).rows[0].code;
    assert.equal((await runtime.fetch(url(code))).status,404);await copy();await project();
    const initial=(await source.pool.query('SELECT * FROM public_projection_outbox WHERE site_id=$1 ORDER BY id',[site.id])).rows[0];
    assert.equal(initial.payload[0].manifest.length,500);assert.equal((await runtime.fetch(url(code))).status,200);
    const writes=runtime.writes.length;await source.close();source=null;
    assert.equal(await(await runtime.fetch(url(code))).text(),'<p>Synthetic500</p>');
    assert.equal(await(await runtime.fetch(url(code,'assets/498.txt'))).text(),'synthetic 498');
    source=await localPostgres({dataDir,initialize:false});services=nodeServices(source.pool);
    assert.equal((await source.pool.query('SELECT status FROM sites WHERE id=$1',[site.id])).rows[0].status,'published');
    assert.equal((await runtime.fetch(url(code))).status,200);assert.equal(runtime.writes.length,writes,'restart required manual projection');
    await services.links.changeShareLink(actor,site.id,'revoke');assert.equal((await runtime.fetch(url(code))).status,200,'pending revoke changes public only after projection');await project();
    assert.equal((await runtime.fetch(url(code))).status,404);await runtime.send(initial);assert.equal((await runtime.fetch(url(code))).status,404);
    const rotated=await services.links.changeShareLink(actor,site.id,'rotate');await project();assert.equal((await runtime.fetch(url(code))).status,404);assert.equal((await runtime.fetch(url(rotated.share_code))).status,200);
    await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>New immutable version</p>'],'synthetic.html'),'New',site.id));await copy();await project();
    assert.equal(await(await runtime.fetch(url(rotated.share_code))).text(),'<p>New immutable version</p>');assert.equal((await runtime.fetch(url(rotated.share_code,'assets/498.txt'))).status,404);
    await services.ops.setPublished(actor,site.id,false);await project();assert.equal((await runtime.fetch(url(rotated.share_code))).status,404);
    await services.ops.setPublished(actor,site.id,true);await project();assert.equal((await runtime.fetch(url(rotated.share_code))).status,200);
    assert.equal(runtime.egress(),0);
  }finally{await source?.close();}
});
