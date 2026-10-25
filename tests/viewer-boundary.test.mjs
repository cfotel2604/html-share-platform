import assert from "node:assert/strict";
import {test} from "node:test";
import {tsLoader} from "./helpers/load-ts.mjs";
test("retired Node public aliases deny without Clerk, redirect or auth cookies",async t=>{
  const keys=["AUTH_MODE","AUTH_TRUSTED_ORIGINS","VIEWER_PUBLIC_ORIGIN","GATEWAY_FRAME_SOURCE","CLERK_SECRET_KEY","CLERK_PUBLISHABLE_KEY"],prior=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
  Object.assign(process.env,{AUTH_MODE:"clerk",AUTH_TRUSTED_ORIGINS:"https://studio.ods.test",VIEWER_PUBLIC_ORIGIN:"https://view.ods.test",GATEWAY_FRAME_SOURCE:"https://*.matbao.test",CLERK_SECRET_KEY:"synthetic",CLERK_PUBLISHABLE_KEY:"synthetic"});
  t.after(()=>{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}});
  let clerkCalls=0;
  const {default:proxy}=tsLoader({"@clerk/nextjs/server":{clerkMiddleware:()=>()=>{clerkCalls++;return new Response("clerk");}}})(new URL("../src/proxy.ts",import.meta.url));
  const request=(path,host="view.ods.test")=>({headers:new Headers({Host:host}),nextUrl:{pathname:path}});
  for(const path of ["/","/api/sites","/api/auth","/sign-in","/preview/"+"a".repeat(32)]) assert.equal((await proxy(request(path),{})).status,404);
  for(const path of ["/"+"a".repeat(32),"/view/"+"a".repeat(32)]) assert.equal((await proxy(request(path),{})).status,404);
  for(const host of ['view.ods.test','studio.ods.test'])for(const path of ['/AbC123xYz9','/AbC123xYz9/','/view/AbC123xYz9','/view/invalid']){
    const response=await proxy(request(path,host),{});assert.equal(response.status,404);assert.equal(response.headers.get('location'),null);
    assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
  }
  assert.equal(clerkCalls,0);
});

test("trusted Studio still invokes Clerk while foreign viewer hosts never do",async t=>{
  const keys=["AUTH_MODE","AUTH_TRUSTED_ORIGINS","VIEWER_PUBLIC_ORIGIN","CLERK_SECRET_KEY","CLERK_PUBLISHABLE_KEY"], prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  Object.assign(process.env,{AUTH_MODE:"clerk",AUTH_TRUSTED_ORIGINS:"https://studio.ods.test",VIEWER_PUBLIC_ORIGIN:"https://view.ods.test",CLERK_SECRET_KEY:'synthetic',CLERK_PUBLISHABLE_KEY:'synthetic'});
  t.after(()=>{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}});
  let calls=0;
  const {default:proxy}=tsLoader({"@clerk/nextjs/server":{clerkMiddleware:()=>()=>{calls++;return new Response('protected');}}})(new URL("../src/proxy.ts",import.meta.url));
  assert.equal((await proxy({headers:new Headers({Host:'view.ods.test'}),nextUrl:{pathname:'/'}},{})).status,404);assert.equal(calls,0);
  assert.equal((await proxy({headers:new Headers({Host:'studio.ods.test'}),nextUrl:{pathname:'/'}},{})).status,200);assert.equal(calls,1);
});
