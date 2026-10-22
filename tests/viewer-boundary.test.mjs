import assert from "node:assert/strict";
import {test} from "node:test";
import {tsLoader} from "./helpers/load-ts.mjs";
test("viewer serves only trusted site shells and never invokes Clerk",async t=>{
  const keys=["AUTH_MODE","AUTH_TRUSTED_ORIGINS","VIEWER_PUBLIC_ORIGIN","GATEWAY_FRAME_SOURCE","CLERK_SECRET_KEY","CLERK_PUBLISHABLE_KEY"],prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{AUTH_MODE:"clerk",AUTH_TRUSTED_ORIGINS:"https://studio.ods.test",VIEWER_PUBLIC_ORIGIN:"https://view.ods.test",GATEWAY_FRAME_SOURCE:"https://*.matbao.test",CLERK_SECRET_KEY:"synthetic",CLERK_PUBLISHABLE_KEY:"synthetic"});
  t.after(()=>{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}});
  let clerkCalls=0;
  const {default:proxy}=tsLoader({"@clerk/nextjs/server":{clerkMiddleware:()=>()=>{clerkCalls++;return new Response("clerk");}}})(new URL("../src/proxy.ts",import.meta.url));
  const request=(path,host="view.ods.test")=>({headers:new Headers({Host:host}),nextUrl:{pathname:path}});
  for(const path of ["/","/api/sites","/api/auth","/sign-in","/preview/"+"a".repeat(32)]) assert.equal((await proxy(request(path),{})).status,404);
  const shell=await proxy(request("/"+"a".repeat(32)),{});assert.equal(shell.status,200);assert.equal(shell.headers.get("set-cookie"),null);assert.match(shell.headers.get("content-security-policy"),/frame-src https:\/\/\*\.matbao.test/);
  assert.equal(clerkCalls,0);
  const redirect=await proxy(request("/view/"+"a".repeat(32),"studio.ods.test"),{});assert.equal(redirect.headers.get("location"),"https://view.ods.test/"+"a".repeat(32));assert.equal(clerkCalls,0);
});
