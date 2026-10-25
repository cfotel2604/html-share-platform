import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {tsLoader} from './helpers/load-ts.mjs';

test('preview formatter retains full identity/entropy in the isolated p namespace',t=>{
  const values={GATEWAY_MODE:'hostname',PUBLIC_SITE_DOMAIN:'matbao.test',PUBLIC_SITE_SCHEME:'https',PUBLIC_SITE_PORT:'',AUTH_TRUSTED_ORIGINS:'https://studio.ods.test'};
  const old=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);
  t.after(()=>{for(const[k,v]of Object.entries(old)){if(v===undefined)delete process.env[k];else process.env[k]=v;}});
  const {previewSiteUrl}=tsLoader()(new URL('../src/lib/public-url.ts',import.meta.url));
  const id='a'.repeat(32),grant='c'.repeat(26),url=new URL(previewSiteUrl(id,grant));
  assert.equal(url.origin,`https://p-${id}--${grant}.matbao.test`);assert.equal(url.hostname.split('.')[0].length,62);
  assert.throws(()=>previewSiteUrl(id,grant.slice(1)),/Invalid/);
});

test('nginx map has two fixed local destinations and namespaces new grants without fallback',()=>{
  const text=readFileSync(new URL('../deploy/nginx.aprime-preview-map.conf.example',import.meta.url),'utf8');
  const map=text.slice(text.indexOf('map $host'),text.indexOf('\n}',text.indexOf('map $host'))+2);
  const match=/"~([^"\n]+)" 127\.0\.0\.1:4110;/.exec(map);assert.ok(match);
  const namespace=new RegExp(match[1]),id='a'.repeat(32),grant='c'.repeat(26);
  assert.equal(namespace.test(`p-${id}--${grant}.lab-space-ods.cfvn.cloud`),true);
  for(const host of [`${id}--${grant}.lab-space-ods.cfvn.cloud`,`p-${id}.lab-space-ods.cfvn.cloud`,`p-${id}--${grant}.lab-space-ods.cfvn.cloud.evil.test`])assert.equal(namespace.test(host),false);
  assert.match(map,/default 127\.0\.0\.1:4100;/);
  assert.deepEqual([...map.matchAll(/127\.0\.0\.1:(\d+)/g)].map(x=>x[1]).sort(),['4100','4110']);
  assert.ok(!map.includes('proxy_pass')); // Selection only; a denied A' grant never retries legacy.
});
