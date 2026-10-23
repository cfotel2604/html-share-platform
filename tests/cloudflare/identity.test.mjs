import assert from 'node:assert/strict';
import { test,before,after } from 'node:test';
import { generateKeyPairSync,sign } from 'node:crypto';
import { verifyToken } from '@clerk/backend';
import { createActor } from '../../cloudflare/shared/auth.mjs';
import { harness } from './harness.mjs';
let h;before(async()=>{h=await harness();});after(async()=>{await h?.close();});
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
function jwt(extra={}) {
  const timestamp=Math.floor(Date.now()/1000),head=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({iss:'https://clerk.synthetic.test',sub:'a',sid:'session_synthetic',iat:timestamp,nbf:timestamp-5,exp:timestamp+120,azp:'https://studio.ods.vn',role:'admin',...extra})).toString('base64url');
  return head+'.'+payload+'.'+sign('RSA-SHA256',Buffer.from(head+'.'+payload),privateKey).toString('base64url');
}
test('Worker identity verifies real signed JWT, ignores role claims, checks online Clerk and D1 policy',async()=>{
  const user={id:'a',primaryEmailAddressId:'e',banned:false,locked:false,emailAddresses:[{id:'e',emailAddress:'a@example.test',verification:{status:'verified'}}],externalAccounts:[{provider:'oauth_google',emailAddress:'a@example.test'}]};
  let active=true,calls=0;
  const actor=createActor({verify:(token,options)=>verifyToken(token,{...options,jwtKey:publicKey.export({type:'spki',format:'pem'})}),
    client:()=>({sessions:{getSession:async()=>{calls++;return {userId:'a',status:active?'active':'revoked',expireAt:Date.now()+60_000};}},users:{getUser:async()=>user}})});
  const env={...h.vars,DB:h.db,CLERK_SECRET_KEY:'sk_test_synthetic'};
  const request=(token,service=env.HSP_SERVICE_TOKEN)=>new Request(env.API_ORIGIN+'/v1/actor',{headers:{Authorization:'Bearer '+token,'X-HSP-Service-Token':service}});
  assert.equal((await actor(request(jwt()),env)).role,'employee');
  await assert.rejects(()=>actor(request(jwt(),'wrong'),env),e=>e.status===401);
  const count=calls;
  for(const token of [jwt({exp:1}),jwt({azp:'https://untrusted.test'}),jwt()+'tampered']) await assert.rejects(()=>actor(request(token),env));
  assert.equal(calls,count);
  active=false;await assert.rejects(()=>actor(request(jwt()),env),e=>e.status===401);active=true;
  user.emailAddresses[0].verification.status='unverified';await assert.rejects(()=>actor(request(jwt()),env),e=>e.status===403);
  user.emailAddresses[0].verification.status='verified';
  await h.db.prepare("UPDATE auth_allowlist SET status='disabled' WHERE email='a@example.test'").run();
  await assert.rejects(()=>actor(request(jwt()),env),e=>e.status===403);
});
