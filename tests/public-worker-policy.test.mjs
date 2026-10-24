import assert from 'node:assert/strict';
import { test } from 'node:test';
import { publicOrigin,requestRoute,publicSnapshot,responseHeaders } from '../cloudflare/public/policy.mjs';

const origin='https://content.example.test',studio='https://studio.example.org';
const site='a'.repeat(32),version='11111111-1111-4111-8111-111111111111',code='AbCd123456';
const asset=(path='index.html')=>({path,r2_key:`${site}/${version}/${path}`,size:1,etag:'synthetic-etag'});
const row=()=>({site_id:site,active_version:version,projection_version:1,updated_at:'2026-10-24T00:00:00.000Z',manifest:JSON.stringify([asset()])});

test('Worker origins fail closed for shared registrable domains, private suffixes and unsafe configuration',()=>{
  assert.equal(publicOrigin(origin,studio),origin);
  for(const pair of [[origin,'https://studio.example.test'],['https://a.github.io','https://b.a.github.io'],['http://content.example.test',studio],[origin+'/',studio],['https://localhost',studio],['https://user:pass@content.example.test',studio]])assert.throws(()=>publicOrigin(...pair));
  assert.equal(publicOrigin('https://a.github.io','https://b.github.io'),'https://a.github.io');
});

test('exact code/root/nested routing rejects unsafe decoded paths and non-manifest origin aliases',()=>{
  assert.deepEqual(requestRoute(`${origin}/${code}`,origin),{code,redirect:true,path:'index.html',type:'text/html; charset=utf-8'});
  assert.equal(requestRoute(`${origin}/${code}/`,origin).path,'index.html');
  assert.equal(requestRoute(`${origin}/${code}/nested/page.html?v=1`,origin).path,'nested/page.html');
  assert.equal(requestRoute(`${origin}/${code}/caf%C3%A9.txt`,origin).path,'café.txt');
  for(const path of ['/',`/${site}/`,`/s/${site}/index.html`,'/api/sites','/preview/grant/',`/${code}/../x.html`,`/${code}/%2e%2e/x.html`,`/${code}/%252e/x.html`,`/${code}/a%2Fb.html`,`/${code}/a%5cb.html`,`/${code}/a%00.html`,`/${code}/a%3f.html`,`/${code}//a.html`,`/${code}/nested/`,`/${code}/data.svg`,`/${code}/a.pdf`,`/${code}/bad%zz.html`])assert.equal(requestRoute(origin+path,origin),null,path);
  assert.equal(requestRoute(`https://other.example.test/${code}/`,origin),null);
});

test('closed manifest pins every asset to the exact site/version and rejects unsafe/extra data',()=>{
  assert.equal(publicSnapshot(row()).get('index.html').type,'text/html; charset=utf-8');
  for(const change of [
    r=>{r.active_version='other';},r=>{r.projection_version=0;},r=>{r.manifest='null';},
    r=>{r.manifest=JSON.stringify([asset('../index.html')]);},
    r=>{r.manifest=JSON.stringify([asset(),{...asset('app.js'),r2_key:'other/secret.js'}]);},
    r=>{r.manifest=JSON.stringify([{...asset(),email:'synthetic@example.test'}]);},
    r=>{r.manifest=JSON.stringify([asset(),asset('INDEX.HTML')]);},
    r=>{r.manifest=JSON.stringify([{...asset(),etag:'"unsafe"'}]);},
    r=>{r.manifest=JSON.stringify([{...asset(),size:104857601}]);},
    r=>{r.manifest=JSON.stringify([asset('data.svg')]);},
  ]){const bad=row();change(bad);assert.throws(()=>publicSnapshot(bad));}
});

test('all HTML response policies include HTTP sandbox and no credential/cache authority',()=>{
  const headers=responseHeaders('text/html; charset=utf-8',origin,code);
  assert.match(headers['Content-Security-Policy'],/^sandbox allow-scripts;/);
  assert.doesNotMatch(headers['Content-Security-Policy'],/allow-same-origin|allow-popups|allow-forms|allow-top-navigation/);
  assert.match(headers['Content-Security-Policy'],/worker-src 'none'/);
  assert.equal(headers['Cache-Control'],'no-store');assert.equal(headers['Referrer-Policy'],'no-referrer');
  assert.equal(headers['Access-Control-Allow-Origin'],'*');assert.equal(headers['X-Content-Type-Options'],'nosniff');
  assert.ok(!Object.hasOwn(headers,'Set-Cookie'));assert.ok(!Object.hasOwn(headers,'Access-Control-Allow-Credentials'));
});
