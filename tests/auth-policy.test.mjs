import assert from "node:assert/strict";
import {test} from "node:test";
import {tsLoader} from "./helpers/load-ts.mjs";

function user(overrides={}) {return {id:"user_fixture",primaryEmailAddressId:"email_1",banned:false,locked:false,
  emailAddresses:[{id:"email_1",emailAddress:"Member@Example.test",verification:{status:"verified"}}],
  externalAccounts:[{provider:"oauth_google",emailAddress:"member@example.test"}],...overrides};}
function fixture({allowed=true,role="employee",identity=null,sessionStatus="active",expires=Date.now()+60000,host="studio.example.test"}={}) {
  const queries=[];
  const load=tsLoader({"./db":{db:()=>({query:async(sql,values)=>{queries.push({sql,values});return {rowCount:allowed?1:0,rows:allowed?[{id:"actor-id",role}]:[]};}})},
    "next/headers":{headers:async()=>new Headers({Host:host})},"./demo-auth":{ownerId:async()=>{throw new Error("Clerk must never fall back to demo");}},
    "@clerk/nextjs/server":{auth:async()=>identity,clerkClient:async()=>({authenticateRequest:async(request,options)=>{
      assert.equal(request.body,null);assert.equal(request.headers.get("x-clerk-auth-token"),null);assert.equal(request.headers.get("x-forwarded-host"),null);
      assert.equal(options.acceptsToken,"session_token");assert.deepEqual(options.authorizedParties,["https://studio.example.test"]);
      return {toAuth:()=>identity};},sessions:{getSession:async()=>({status:sessionStatus,userId:identity.userId,expireAt:expires})},users:{getUser:async()=>user()}})}});
  return {policy:load(new URL("../src/lib/auth-policy.ts",import.meta.url)),auth:load(new URL("../src/lib/auth.ts",import.meta.url)),queries};
}
function clerkEnv(t) {const prior={...process.env};process.env.AUTH_MODE="clerk";process.env.CLERK_SECRET_KEY="synthetic-only";process.env.CLERK_PUBLISHABLE_KEY="synthetic-only";process.env.AUTH_TRUSTED_ORIGINS="https://studio.example.test";t.after(()=>{for(const key of ["AUTH_MODE","CLERK_SECRET_KEY","CLERK_PUBLISHABLE_KEY","AUTH_TRUSTED_ORIGINS"]) {if(prior[key]===undefined) delete process.env[key];else process.env[key]=prior[key];}});}
test("only verified primary Google email can reach allowlist lookup",async()=>{
  const f=fixture();assert.equal(f.policy.verifiedGoogleEmail(user()),"member@example.test");
  for(const invalid of [user({banned:true}),user({locked:true}),user({primaryEmailAddressId:null}),user({externalAccounts:[]}),
    user({emailAddresses:[{id:"email_1",emailAddress:"member@example.test",verification:{status:"unverified"}}]}),
    user({externalAccounts:[{provider:"oauth_google",emailAddress:"other@example.test"}]})]) {
    await assert.rejects(f.policy.resolveClerkActor(invalid),error=>error.status===403);
  }
  assert.equal(f.queries.length,0);
});
test("role claims are ignored; role comes from active server allowlist",async()=>{
  const f=fixture();const actor=await f.policy.resolveClerkActor(user({publicMetadata:{role:"admin"},unsafeMetadata:{role:"admin"}}));
  assert.deepEqual(actor,{id:"actor-id",role:"employee",mode:"clerk"});
  assert.deepEqual(f.queries[0].values,["clerk:user_fixture","member@example.test"]);
  assert.match(f.queries[0].sql,/WHERE users.status='active'/);
});
test("allowlist revocation or disabled user denies next request",async()=>{
  const f=fixture({allowed:false});await assert.rejects(f.policy.resolveClerkActor(user()),error=>error.status===403);
});
for(const [name,options] of [["guest",{identity:{userId:null,sessionId:null}}],["revoked",{sessionStatus:"revoked"}],["expired",{expires:Date.now()-1000}]]) {
  test(`${name} session cannot resolve a user or policy`,async t=>{clerkEnv(t);const f=fixture({identity:{userId:"user_fixture",sessionId:"session_fixture"},...options});assert.equal(await f.auth.currentActor(),null);assert.equal(f.queries.length,0);});
}
test("Clerk mode does not accept demo cookies or fall back with missing keys",async t=>{
  clerkEnv(t);delete process.env.CLERK_SECRET_KEY;const f=fixture();assert.equal(await f.auth.currentActor(),null);
});
test("forged role in session cannot escalate API actor",async t=>{
  clerkEnv(t);const f=fixture({identity:{userId:"user_fixture",sessionId:"session_fixture",sessionClaims:{role:"admin"}}});
  assert.equal((await f.auth.requireActor()).role,"employee");
});
test("mutation rechecks fresh policy role under shared row locks",async()=>{
  const f=fixture(),queries=[];
  const client={query:async(sql,values)=>{queries.push({sql,values});return {rowCount:1,rows:[{id:"actor-id",role:"employee"}]};}};
  assert.equal((await f.policy.lockActor(client,{id:"actor-id",role:"admin",mode:"clerk"})).role,"employee");
  assert.match(queries[0].sql,/FOR SHARE OF u,a/);
  client.query=async()=>({rowCount:0,rows:[]});await assert.rejects(f.policy.lockActor(client,{id:"actor-id",role:"admin",mode:"clerk"}),error=>error.status===403);
});
test("CSRF requires exact configured scheme/origin/Host and rejects cross-site requests",t=>{
  clerkEnv(t);const {sameOrigin}=tsLoader()(new URL("../src/lib/auth-config.ts",import.meta.url));
  const request=(origin,host="studio.example.test",fetchSite="same-origin")=>new Request("http://internal/api/sites",{headers:{Origin:origin,Host:host,"Sec-Fetch-Site":fetchSite}});
  assert.equal(sameOrigin(request("https://studio.example.test")),true);
  for(const req of [request("http://studio.example.test"),request("https://evil.example.test"),request("null"),request("https://studio.example.test","evil.example.test"),request("https://studio.example.test","studio.example.test","cross-site"),new Request("http://internal")]) assert.equal(sameOrigin(req),false);
});
test("direct API auth verifies only headers and rejects forged Clerk/forwarded headers",async t=>{
  clerkEnv(t);const f=fixture({identity:{userId:"user_fixture",sessionId:"session_fixture",sessionClaims:{role:"admin"}}});let reads=0;
  const request=new Request("http://internal/api/sites",{method:"POST",headers:{Host:"studio.example.test","X-Clerk-Auth-Token":"forged","X-Forwarded-Host":"evil.example.test"},body:new ReadableStream({pull(){reads++;}},{highWaterMark:0}),duplex:"half"});
  assert.equal((await f.auth.requireActor(request)).role,"employee");assert.equal(reads,0);
});
test("viewer and unknown API hosts cannot read dashboard data",async t=>{
  clerkEnv(t);const f=fixture();await assert.rejects(f.auth.requireActor(new Request("http://internal/api/sites",{headers:{Host:"view.example.test"}})),error=>error.status===404);assert.equal(f.queries.length,0);
});
