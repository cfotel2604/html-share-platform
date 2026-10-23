import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync,sign } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { verifyToken } from '@clerk/backend';
import { tsLoader } from './helpers/load-ts.mjs';
const {clerkTokenProvider}=tsLoader()(new URL('../src/lib/cloudflare-token.ts',import.meta.url));
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
    const scope={userId:'a',sessionId:'session_a',origin,token:jwt()};
    const provider=clerkTokenProvider(scope,{verify,client:()=>({sessions:{
      getSession:async id=>{assert.equal(id,'session_a');return {status:'active',userId:'a',expireAt:Date.now()+3600_000};},
      getToken:async(...args)=>{
        assert.deepEqual(args,['session_a']); // Default lifetime, not an extended JWT.
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
    const scope={userId:'a',sessionId:'session_a',origin,token:jwt()};
    const provider=clerkTokenProvider(scope,{verify,client:()=>({sessions:{getSession:async()=>session,getToken:async()=>{mints++;return {jwt:jwt()};}}})});
    await provider(AbortSignal.timeout(1000));t.mock.timers.tick(70_000);
    await assert.rejects(()=>provider(AbortSignal.timeout(1000)),e=>e.status===401);assert.equal(mints,0);
  }
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
