import assert from 'node:assert/strict';
import { test } from 'node:test';
import { servePublic } from '../cloudflare/public/serve.mjs';

const origin='https://content.example.test',settings={publicOrigin:origin,studioOrigin:'https://studio.example.org'};
const code='AbCd123456',site='a'.repeat(32),version='11111111-1111-4111-8111-111111111111';
const html='<script>/* synthetic untrusted bytes, never server execution */</script>';
const entries=['index.html','nested/page.html','style.css','app.mjs'].map(path=>({path,r2_key:`${site}/${version}/${path}`,size:Buffer.byteLength(html),etag:'synthetic-etag'}));
const row=()=>({site_id:site,active_version:version,projection_version:1,updated_at:'2026-10-24T00:00:00.000Z',manifest:JSON.stringify(entries)});
function reader(result=row()){
  const calls={lookup:[],get:[],head:[]};
  return {calls,lookup:async value=>{calls.lookup.push(value);return result;},
    get:async(...args)=>{calls.get.push(args);return {body:new Response(html).body,size:Buffer.byteLength(html),etag:'synthetic-etag',httpMetadata:{contentType:'text/unsafe',cacheControl:'public',contentDisposition:'unsafe'}};},
    head:async key=>{calls.head.push(key);return {size:Buffer.byteLength(html),etag:'synthetic-etag'};}};
}
const request=(path='/',options={})=>new Request(origin+'/'+code+path,options);
const security=response=>{
  assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('Set-Cookie'),null);
};

test('published root/nested/direct HTML streams exact bytes and sandbox headers, one lookup each',async()=>{
  for(const path of ['/','/index.html','/nested/page.html']){
    const storage=reader();const response=await servePublic(request(path),storage,settings);
    assert.equal(response.status,200);assert.equal(await response.text(),html);security(response);
    assert.match(response.headers.get('Content-Security-Policy'),/^sandbox allow-scripts;/);
    assert.doesNotMatch(response.headers.get('Content-Security-Policy'),/allow-same-origin/);
    assert.equal(response.headers.get('Content-Type'),'text/html; charset=utf-8');
    assert.equal(response.headers.get('Content-Disposition'),null);assert.equal(storage.calls.lookup.length,1);
    assert.equal(storage.calls.get.length,1);assert.deepEqual(storage.calls.get[0][1],{onlyIf:{etagMatches:'synthetic-etag'}});
  }
});

test('canonical redirect validates published code/manifest, drops query and never reads R2',async()=>{
  const storage=reader();const response=await servePublic(request('?ignored=1'),storage,settings);
  assert.equal(response.status,308);assert.equal(response.headers.get('Location'),'/'+code+'/');security(response);
  assert.equal(storage.calls.lookup.length,1);assert.equal(storage.calls.get.length,0);
  const denied=await servePublic(request(''),reader(null),settings);assert.equal(denied.status,404);assert.equal(denied.headers.get('Location'),null);
});

test('missing/unpublished/revoked filtered lookup denies with no R2 access',async()=>{
  for(const status of ['missing','unpublished','revoked']){
    const storage=reader(null);const response=await servePublic(request(),storage,settings);
    assert.equal(response.status,404,status);security(response);assert.equal(storage.calls.lookup.length,1);assert.equal(storage.calls.get.length,0);
  }
});

test('invalid routes/admin/preview/host aliases never consult storage; outside manifest reads no R2',async()=>{
  for(const path of ['/api/sites','/preview/grant/','/'+site+'/','/'+code+'/data.svg','/'+code+'/nested/']){
    const storage=reader();const response=await servePublic(new Request(origin+path),storage,settings);
    assert.equal(response.status,404);assert.equal(storage.calls.lookup.length,0);security(response);
  }
  const storage=reader();assert.equal((await servePublic(request('/unlisted.js'),storage,settings)).status,404);
  assert.equal(storage.calls.lookup.length,1);assert.equal(storage.calls.get.length,0);
  const method=reader();const response=await servePublic(request('/',{method:'POST',body:'synthetic'}),method,settings);
  assert.equal(response.status,405);assert.equal(response.headers.get('Allow'),'GET, HEAD');assert.equal(method.calls.lookup.length,0);
});

test('HEAD validates metadata with no body; conditional/range requests cannot skip published lookup',async()=>{
  const storage=reader();const response=await servePublic(request('/',{method:'HEAD'}),storage,settings);
  assert.equal(response.status,200);assert.equal(await response.text(),'');assert.equal(response.headers.get('Content-Length'),String(Buffer.byteLength(html)));
  assert.equal(storage.calls.head.length,1);assert.equal(storage.calls.get.length,0);security(response);
  const condition=reader();const full=await servePublic(request('/',{headers:{Range:'bytes=0-1','If-None-Match':'"synthetic-etag"','If-Modified-Since':new Date().toUTCString()}}),condition,settings);
  assert.equal(full.status,200);assert.equal(await full.text(),html);assert.equal(condition.calls.lookup.length,1);
  assert.deepEqual(condition.calls.get[0][1],{onlyIf:{etagMatches:'synthetic-etag'}});
  const denied=await servePublic(request('/',{method:'HEAD',headers:{'If-None-Match':'"synthetic-etag"'}}),reader(null),settings);
  assert.equal(denied.status,404);assert.equal(await denied.text(),'');
});

test('missing/mismatched/conditional R2 object and corrupt manifest fail closed before content',async()=>{
  for(const object of [null,{size:Buffer.byteLength(html),etag:'synthetic-etag'},
    {size:1,etag:'synthetic-etag',body:new Response('wrong-size').body},
    {size:Buffer.byteLength(html),etag:'wrong-etag',body:new Response('wrong-etag').body}]){
    const storage=reader();storage.get=async()=>object;const response=await servePublic(request(),storage,settings);
    assert.equal(response.status,503);assert.equal(await response.text(),'Serving unavailable');security(response);
  }
  const bad=row();bad.manifest=JSON.stringify([{...entries[0],r2_key:'other-site/private.html'}]);const storage=reader(bad);
  assert.equal((await servePublic(request(),storage,settings)).status,503);assert.equal(storage.calls.get.length,0);
});

test('provider/config failure is static, uploaded code stays bytes and no outbound fetch/log can occur',async t=>{
  t.mock.method(globalThis,'fetch',()=>assert.fail('public code called external/VM fetch'));
  t.mock.method(console,'error',()=>assert.fail('public code logged provider data'));
  t.mock.method(console,'log',()=>assert.fail('public code logged uploaded data'));
  const storage=reader();storage.lookup=async()=>{throw new Error('SYNTHETIC_TOKEN_SQL_AND_CONTENT');};
  const response=await servePublic(request(),storage,settings);assert.equal(response.status,503);assert.equal(await response.text(),'Serving unavailable');
  const noNetwork=await servePublic(request(),reader(),settings);assert.equal(await noNetwork.text(),html);
  assert.equal((await servePublic(request(),reader(),{...settings,studioOrigin:origin})).status,503);
});
