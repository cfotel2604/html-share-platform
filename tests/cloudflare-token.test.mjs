import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync,sign } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { verifyToken } from '@clerk/backend';
import { tsLoader } from './helpers/load-ts.mjs';
const {clerkTokenProvider,clerkRefreshCookie}=tsLoader()(new URL('../src/lib/cloudflare-token.ts',import.meta.url));
import { getCookieSuffix } from '@clerk/shared/keys';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwtKey=publicKey.export({type:'spki',format:'pem'}),origin='https://studio.synthetic.test';
function jwt(extra={}) {
  const now=Math.floor(Date.now()/1000),head=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({iss:'https://clerk.synthetic.test',sub:'a',sid:'session_a',azp:origin,iat:now,nbf:now-5,exp:now+60,...extra})).toString('base64url');
  return head+'.'+payload+'.'+sign('RSA-SHA256',Buffer.from(head+'.'+payload),privateKey).toString('base64url');
}
const verify=(token,options)=>verifyToken(token,{...options,jwtKey});

test('fresh Clerk token must match user/session/party, expiry and signature; no TTL override',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.now()});
  for(const defect of ['user','session','party','missing-party','expired','tampered']) {
    const scope={userId:'a',sessionId:'session_a',origin,token:jwt(),refreshToken:'synthetic-refresh'};
    const provider=clerkTokenProvider(scope,{verify,client:()=>({sessions:{
      getSession:async id=>{assert.equal(id,'session_a');return {status:'active',userId:'a',expireAt:Date.now()+3600_000};},
      getToken:async()=>{throw new Error('Unscoped BAPI mint forbidden');},
      refreshSession:async(...args)=>{
        assert.deepEqual(args,['session_a',{expired_token:scope.token,refresh_token:scope.refreshToken,request_origin:origin,format:'token'}]);
        const extra=defect==='user'?{sub:'b'}:defect==='session'?{sid:'session_b'}:defect==='party'?{azp:'https://other.test'}:defect==='missing-party'?{azp:undefined}:defect==='expired'?{exp:1}:{};
        return {jwt:jwt(extra)+(defect==='tampered'?'corrupt':'')};
      },
    }})});
    assert.equal(await provider(AbortSignal.timeout(1000)),scope.token);
    t.mock.timers.tick(70_000);
    await assert.rejects(()=>provider(AbortSignal.timeout(1000)),undefined,defect);
  }
});

test('refresh refuses a session that belongs to another user or is expired before mint',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.now()});
  for(const session of [{status:'active',userId:'b',expireAt:Date.now()+3600_000},{status:'active',userId:'a',expireAt:1}]) {
    let mints=0;
    const scope={userId:'a',sessionId:'session_a',origin,token:jwt(),refreshToken:'synthetic-refresh'};
    const provider=clerkTokenProvider(scope,{verify,client:()=>({sessions:{getSession:async()=>session,refreshSession:async()=>{mints++;return {jwt:jwt()};}}})});
    await provider(AbortSignal.timeout(1000));t.mock.timers.tick(70_000);
    await assert.rejects(()=>provider(AbortSignal.timeout(1000)),e=>e.status===401);assert.equal(mints,0);
  }
});

test('refresh cookie selection uses exact Clerk instance suffix and refuses ambiguous/foreign credentials',async()=>{
  const key='pk_test_synthetic',suffix=await getCookieSuffix(key),name='__refresh_'+suffix;
  assert.equal(await clerkRefreshCookie(`${name}=synthetic%2Drefresh; __refresh_other123=foreign`,key),'synthetic-refresh');
  assert.equal(await clerkRefreshCookie('__refresh=legacy; __refresh_other123=foreign',key),undefined);
  assert.equal(await clerkRefreshCookie(`${name}=a; ${name}=b`,key),undefined);
  assert.equal(await clerkRefreshCookie(`${name}=%invalid`,key),undefined);
  assert.equal(await clerkRefreshCookie(`${name}=contains%20space`,key),undefined);
  assert.equal(await clerkRefreshCookie(`${name}=${'x'.repeat(33000)}`,key),undefined);
});

test('an upload without a refresh credential never falls back to azp-less BAPI mint',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.now()});let calls=0;
  const provider=clerkTokenProvider({userId:'a',sessionId:'session_a',origin,token:jwt()},{verify,client:()=>({sessions:{
    getSession:async()=>({status:'active',userId:'a',expireAt:Date.now()+3600_000}),
    getToken:async()=>{calls++;return {jwt:jwt({azp:undefined})};},
    refreshSession:async()=>{calls++;return {jwt:jwt()};},
  }})});
  await provider(AbortSignal.timeout(1000));t.mock.timers.tick(70000);
  await assert.rejects(()=>provider(AbortSignal.timeout(1000)),e=>e.status===503);assert.equal(calls,0);
});

test('repeated refresh uses the last verified token and leaves lifetime/session/party checks intact',async t=>{
  t.mock.timers.enable({apis:['Date'],now:Date.now()});const seen=[];const scope={userId:'a',sessionId:'session_a',origin,token:jwt(),refreshToken:'synthetic-refresh'};
  const fresh=[];
  const provider=clerkTokenProvider(scope,{verify,client:()=>({sessions:{
    getSession:async()=>({status:'active',userId:'a',expireAt:Date.now()+3600_000}),
    refreshSession:async(id,params)=>{assert.equal(id,'session_a');seen.push(params.expired_token);fresh.push(jwt());return {jwt:fresh.at(-1)};},
  }})});
  await provider(AbortSignal.timeout(1000));t.mock.timers.tick(70000);await provider(AbortSignal.timeout(1000));
  t.mock.timers.tick(70000);await provider(AbortSignal.timeout(1000));
  assert.deepEqual(seen,[scope.token,fresh[0]]);
});

test('R2 transport forwards abort signals and destroys readback bodies after headers',async t=>{
  const names=['CLOUDFLARE_R2_ENDPOINT','CLOUDFLARE_R2_BUCKET','CLOUDFLARE_R2_ACCESS_KEY','CLOUDFLARE_R2_SECRET_KEY'],old=names.map(k=>process.env[k]);
  Object.assign(process.env,{CLOUDFLARE_R2_ENDPOINT:'https://synthetic.r2.cloudflarestorage.com',CLOUDFLARE_R2_BUCKET:'synthetic',CLOUDFLARE_R2_ACCESS_KEY:'synthetic',CLOUDFLARE_R2_SECRET_KEY:'synthetic'});
  t.after(()=>names.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]));
  const source=new PassThrough();const calls=[];let closed=false;
  class Command{constructor(input){this.input=input;}}
  class S3Client{async send(command,options){calls.push({command,options});return {ETag:'"synthetic-etag"',Body:source};}destroy(){closed=true;}}
  const {pilotObjectStore}=tsLoader({'@aws-sdk/client-s3':{S3Client,PutObjectCommand:Command,GetObjectCommand:Command}})(new URL('../src/lib/cloudflare-upload.ts',import.meta.url));
  const store=pilotObjectStore(),controller=new AbortController();
  await store.put('synthetic/key',Buffer.from('body'),'text/html',controller.signal);
  const read=await store.read('synthetic/key','synthetic-etag',controller.signal);
  const next=read.body[Symbol.asyncIterator]().next();controller.abort();
  await assert.rejects(()=>next);assert.equal(source.destroyed,true);
  assert.equal(calls[0].command.input.IfNoneMatch,'*');assert.equal(calls[1].command.input.IfMatch,'"synthetic-etag"');
  assert.ok(calls.every(c=>c.options.abortSignal===controller.signal));
  store.close();assert.equal(closed,true);
});
