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
  for(const path of ["/"+"a".repeat(32),"/view/"+"a".repeat(32)]) assert.equal((await proxy(request(path),{})).status,404);
  const shell=await proxy(request("/AbC123xYz9"),{});assert.equal(shell.status,200);assert.equal(shell.headers.get("set-cookie"),null);assert.match(shell.headers.get("content-security-policy"),/frame-src https:\/\/\*\.matbao.test/);
  assert.equal(clerkCalls,0);
  const redirect=await proxy(request("/view/AbC123xYz9","studio.ods.test"),{});assert.equal(redirect.headers.get("location"),"https://view.ods.test/AbC123xYz9");assert.equal(clerkCalls,0);
  assert.equal(redirect.headers.get("referrer-policy"),"no-referrer");
});

test("viewer quota rejection cannot invoke Clerk or reach a shell",async t=>{
  const keys=["AUTH_MODE","AUTH_TRUSTED_ORIGINS","VIEWER_PUBLIC_ORIGIN"], prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{AUTH_MODE:"clerk",AUTH_TRUSTED_ORIGINS:"https://studio.ods.test",VIEWER_PUBLIC_ORIGIN:"https://view.ods.test"});
  t.after(()=>{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}});
  const {default:proxy}=tsLoader({"@/lib/viewer-limit":{viewerLimit:()=>7},"@clerk/nextjs/server":{clerkMiddleware:()=>assert.fail("Clerk invoked")}})(new URL("../src/proxy.ts",import.meta.url));
  const result=await proxy({headers:new Headers({Host:"view.ods.test"}),nextUrl:{pathname:"/AbC123xYz9"}},{});
  assert.equal(result.status,429);assert.equal(result.headers.get("retry-after"),"7");assert.equal(result.headers.get("cache-control"),"no-store");
});
