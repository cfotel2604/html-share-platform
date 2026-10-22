import assert from "node:assert/strict";
import {test} from "node:test";
import {generateKeyPairSync,sign} from "node:crypto";
import {createClerkClient} from "@clerk/backend";
import {tsLoader} from "./helpers/load-ts.mjs";
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const key=publicKey.export({type:"spki",format:"pem"});
const pk="pk_test_"+Buffer.from("clerk.synthetic.test$").toString("base64");
function jwt(overrides={}) {
  const now=Math.floor(Date.now()/1000);
  const header=Buffer.from(JSON.stringify({alg:"RS256",typ:"JWT"})).toString("base64url");
  const payload=Buffer.from(JSON.stringify({iss:"https://clerk.synthetic.test",sub:"user_fixture",sid:"session_fixture",iat:now,nbf:now-5,exp:now+60,azp:"https://studio.example.test",...overrides})).toString("base64url");
  const input=header+"."+payload;return input+"."+sign("RSA-SHA256",Buffer.from(input),privateKey).toString("base64url");
}
function fixture(t) {
  const names=["AUTH_MODE","AUTH_TRUSTED_ORIGINS","CLERK_SECRET_KEY","CLERK_PUBLISHABLE_KEY"],before=Object.fromEntries(names.map(name=>[name,process.env[name]]));
  Object.assign(process.env,{AUTH_MODE:"clerk",AUTH_TRUSTED_ORIGINS:"https://studio.example.test",CLERK_SECRET_KEY:"sk_test_synthetic",CLERK_PUBLISHABLE_KEY:pk});
  t.after(()=>{for(const name of names){if(before[name]===undefined)delete process.env[name];else process.env[name]=before[name];}});
  const sdk=createClerkClient({secretKey:"sk_test_synthetic",publishableKey:pk});let policies=0;
  const client={authenticateRequest:(request,options)=>sdk.authenticateRequest(request,{...options,jwtKey:key}),
    sessions:{getSession:async()=>({status:"active",userId:"user_fixture",expireAt:Date.now()+60000})},
    users:{getUser:async()=>({id:"user_fixture",primaryEmailAddressId:"e",banned:false,locked:false,emailAddresses:[{id:"e",emailAddress:"fixture@example.test",verification:{status:"verified"}}],externalAccounts:[{provider:"oauth_google",emailAddress:"fixture@example.test"}]})}};
  const source=tsLoader({"@clerk/nextjs/server":{clerkClient:async()=>client},"./db":{db:()=>({query:async()=>{policies++;return {rowCount:1,rows:[{id:"actor",role:"employee"}]};}})}})(new URL("../src/lib/auth.ts",import.meta.url));
  const request=token=>new Request("http://internal/api/sites",{method:"POST",headers:{Host:"studio.example.test",Authorization:"Bearer "+token,"X-Clerk-Auth-Status":"signed-in","X-Clerk-Auth-Token":"forged"}});
  return {...source,request,policies:()=>policies};
}
test("production API auth verifies an actual RS256 session JWT and ignores signed role claims",async t=>{
  const f=fixture(t);assert.equal((await f.requireActor(f.request(jwt({role:"admin"})))).role,"employee");assert.equal(f.policies(),1);
});
for(const kind of ["expired","wrong-party","tampered"])test(`actual SDK rejects ${kind} JWT before policy/DB`,async t=>{
  const f=fixture(t);let token=jwt(kind==="expired"?{exp:Math.floor(Date.now()/1000)-20}:kind==="wrong-party"?{azp:"https://evil.example.test"}:{});
  if(kind==="tampered"){const parts=token.split(".");parts[1]=Buffer.from(JSON.stringify({...JSON.parse(Buffer.from(parts[1],"base64url")),role:"admin"})).toString("base64url");token=parts.join(".");}
  assert.equal(await f.currentActor(f.request(token)),null);assert.equal(f.policies(),0);
});
