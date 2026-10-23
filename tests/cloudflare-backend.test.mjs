import assert from 'node:assert/strict';
import {test} from 'node:test';
import {tsLoader} from './helpers/load-ts.mjs';
test('pilot facade uses only authenticated Worker metadata; malformed backend never falls back to PG',async t=>{
  const names=['METADATA_BACKEND','CLOUDFLARE_API_ORIGIN','CLOUDFLARE_SERVICE_TOKEN'],saved=names.map(k=>process.env[k]);
  Object.assign(process.env,{METADATA_BACKEND:'cloudflare',CLOUDFLARE_API_ORIGIN:'https://hsp-api.odsusercontent.workers.dev',CLOUDFLARE_SERVICE_TOKEN:'synthetic-local-service-token-123456789'});
  t.after(()=>names.forEach((k,i)=>saved[i]===undefined?delete process.env[k]:process.env[k]=saved[i]));
  const calls=[];t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls.push({url,options});return Response.json({sites:[]});
  });
  const fail=()=>{throw new Error('PostgreSQL fallback forbidden');};
  const facade=tsLoader({'@/lib/site-ops':{listSites:fail},'@/lib/share-links':{},'@/lib/preview':{},'./db':{db:fail}})(new URL('../src/lib/platform-ops.ts',import.meta.url));
  assert.deepEqual(await facade.listSites({id:'actor',role:'employee',mode:'clerk',sessionToken:'synthetic-session'}),[]);
  assert.equal(calls.length,1);assert.equal(calls[0].options.headers.Authorization,'Bearer synthetic-session');
  process.env.METADATA_BACKEND='misspelled';await assert.rejects(()=>facade.listSites({id:'actor'}));assert.equal(calls.length,1);
});
test('pilot RPC retries with the same idempotency key and never follows redirects',async t=>{
  const saved={...process.env};Object.assign(process.env,{CLOUDFLARE_API_ORIGIN:'https://hsp-api.odsusercontent.workers.dev',CLOUDFLARE_SERVICE_TOKEN:'synthetic-local-service-token-123456789'});
  t.after(()=>{for(const k of ['CLOUDFLARE_API_ORIGIN','CLOUDFLARE_SERVICE_TOKEN']){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}});
  const {cloudflareClient}=tsLoader()(new URL('../src/lib/cloudflare-rpc.ts',import.meta.url));let n=0;const keys=[];
  const client=cloudflareClient('synthetic-session',async(_url,options)=>{keys.push(options.headers['Idempotency-Key']);assert.equal(options.redirect,'error');return ++n===1?new Response('provider error',{status:503}):Response.json({ok:true});});
  assert.deepEqual(await client('/v1/sites','POST',{}),{ok:true});assert.equal(keys[0],keys[1]);
});
test('pilot disables PostgreSQL connection creation and local demo before any database access',async t=>{
  const previous=process.env.METADATA_BACKEND;process.env.METADATA_BACKEND='cloudflare';
  t.after(()=>previous===undefined?delete process.env.METADATA_BACKEND:process.env.METADATA_BACKEND=previous);
  const {db}=tsLoader()(new URL('../src/lib/db.ts',import.meta.url));assert.throws(()=>db(),/disabled/);
  const {demoEnabled}=tsLoader({'next/headers':{},'./db':{db:()=>{throw new Error('forbidden');}}})(new URL('../src/lib/demo-auth.ts',import.meta.url));
  assert.equal(demoEnabled(),false);
});
test('pilot readiness uses Worker service health and never instantiates a pg Client',async t=>{
  const previous=process.env.METADATA_BACKEND;process.env.METADATA_BACKEND='cloudflare';
  t.after(()=>previous===undefined?delete process.env.METADATA_BACKEND:process.env.METADATA_BACKEND=previous);
  let checks=0;
  const {GET}=tsLoader({'pg':{Client:class{constructor(){throw new Error('unexpected pg Client');}}},'@/lib/cloudflare-rpc':{cloudflareReady:async()=>{checks++;}}})(new URL('../src/app/api/health/ready/route.ts',import.meta.url));
  assert.equal((await GET()).status,200);assert.equal(checks,1);
});
