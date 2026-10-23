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
  assert.deepEqual(await facade.listSites({id:'actor',role:'employee',mode:'clerk',getSessionToken:async()=> 'synthetic-session'}),[]);
  assert.equal(calls.length,1);assert.equal(calls[0].options.headers.Authorization,'Bearer synthetic-session');
  process.env.METADATA_BACKEND='misspelled';await assert.rejects(()=>facade.listSites({id:'actor'}));assert.equal(calls.length,1);
});
test('pilot RPC retries with the same idempotency key and never follows redirects',async t=>{
  const saved={...process.env};Object.assign(process.env,{CLOUDFLARE_API_ORIGIN:'https://hsp-api.odsusercontent.workers.dev',CLOUDFLARE_SERVICE_TOKEN:'synthetic-local-service-token-123456789'});
  t.after(()=>{for(const k of ['CLOUDFLARE_API_ORIGIN','CLOUDFLARE_SERVICE_TOKEN']){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}});
  const {cloudflareClient}=tsLoader()(new URL('../src/lib/cloudflare-rpc.ts',import.meta.url));let n=0;const keys=[];
  const tokens=[];
  const client=cloudflareClient(async()=> 'synthetic-session-'+n,async(_url,options)=>{tokens.push(options.headers.Authorization);keys.push(options.headers['Idempotency-Key']);assert.equal(options.redirect,'error');return ++n===1?new Response('provider error',{status:503}):Response.json({ok:true});});
  assert.deepEqual(await client('/v1/sites','POST',{}),{ok:true});assert.equal(keys[0],keys[1]);
  assert.notEqual(tokens[0],tokens[1]);
});

test('pilot actor retains a server token provider scoped to the authenticated identity',async t=>{
  const names=['METADATA_BACKEND','AUTH_MODE','AUTH_TRUSTED_ORIGINS','CLERK_SECRET_KEY','CLERK_PUBLISHABLE_KEY'];
  const old=names.map(k=>process.env[k]);
  Object.assign(process.env,{METADATA_BACKEND:'cloudflare',AUTH_MODE:'clerk',AUTH_TRUSTED_ORIGINS:'https://studio.example.test',CLERK_SECRET_KEY:'sk_test_synthetic',CLERK_PUBLISHABLE_KEY:'pk_test_synthetic'});
  t.after(()=>names.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]));
  const provider=async()=> 'fresh-synthetic';let captured;
  const identity={userId:'clerk-user',sessionId:'clerk-session',getToken:async()=> 'original-synthetic'};
  const {currentActor}=tsLoader({
    '@clerk/nextjs/server':{clerkClient:async()=>({authenticateRequest:async()=>({toAuth:()=>identity})})},
    './cloudflare-token':{clerkRefreshCookie:async()=>undefined,clerkTokenProvider:scope=>{captured=scope;return provider;}},
    './cloudflare-rpc':{cloudflareClient:getToken=>{assert.equal(getToken,provider);return async()=>({id:'d1-user',role:'employee'});}},
    './db':{db:()=>{throw new Error('PG forbidden');}},
  })(new URL('../src/lib/auth.ts',import.meta.url));
  const actor=await currentActor(new Request('https://studio.example.test/api/sites',{headers:{host:'studio.example.test'}}));
  assert.deepEqual(captured,{userId:'clerk-user',sessionId:'clerk-session',origin:'https://studio.example.test',token:'original-synthetic'});
  assert.equal(actor.getSessionToken,provider);assert.equal(actor.sessionToken,undefined);
});

test('pilot RPC cancellation bounds a stalled token provider before any HTTP request',async t=>{
  const names=['CLOUDFLARE_API_ORIGIN','CLOUDFLARE_SERVICE_TOKEN'],old=names.map(k=>process.env[k]);
  Object.assign(process.env,{CLOUDFLARE_API_ORIGIN:'https://hsp-api.odsusercontent.workers.dev',CLOUDFLARE_SERVICE_TOKEN:'synthetic-local-service-token-123456789'});
  t.after(()=>names.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]));
  const {cloudflareClient}=tsLoader()(new URL('../src/lib/cloudflare-rpc.ts',import.meta.url));
  const controller=new AbortController();let requests=0;
  const rpc=cloudflareClient(async()=>{controller.abort();return new Promise(()=>{});},async()=>{requests++;return Response.json({});});
  await assert.rejects(()=>rpc('/v1/sites','GET',undefined,undefined,controller.signal),e=>e.status===503);
  assert.equal(requests,0);
});

test('server-rendered private preview keeps refresh credential in the verified request scope',async t=>{
  const keys=['METADATA_BACKEND','AUTH_MODE','AUTH_TRUSTED_ORIGINS','CLERK_SECRET_KEY','CLERK_PUBLISHABLE_KEY'],old=keys.map(k=>process.env[k]);
  Object.assign(process.env,{METADATA_BACKEND:'cloudflare',AUTH_MODE:'clerk',AUTH_TRUSTED_ORIGINS:'https://studio.example.test',CLERK_SECRET_KEY:'sk_test_synthetic',CLERK_PUBLISHABLE_KEY:'pk_test_synthetic'});
  t.after(()=>keys.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]));
  let scope;
  const {currentActor}=tsLoader({
    'next/headers':{headers:async()=>new Headers({host:'studio.example.test',cookie:'synthetic-private-refresh'})},
    '@clerk/nextjs/server':{auth:async()=>({userId:'verified-user',sessionId:'verified-session',getToken:async()=> 'verified-seed'})},
    './cloudflare-token':{
      clerkRefreshCookie:async(header,key)=>{assert.equal(header,'synthetic-private-refresh');assert.equal(key,'pk_test_synthetic');return 'synthetic-credential';},
      clerkTokenProvider:value=>{scope=value;return async()=> 'verified-token';},
    },
    './cloudflare-rpc':{cloudflareClient:()=>async()=>({id:'internal-user',role:'employee'})},
    './db':{db:()=>{throw new Error('PG forbidden');}},
  })(new URL('../src/lib/auth.ts',import.meta.url));
  const actor=await currentActor();
  assert.deepEqual(scope,{userId:'verified-user',sessionId:'verified-session',token:'verified-seed',origin:'https://studio.example.test',refreshToken:'synthetic-credential'});
  assert.equal(actor.refreshToken,undefined);assert.equal(actor.sessionToken,undefined);
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
