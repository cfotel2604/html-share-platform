import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tsLoader } from './helpers/load-ts.mjs';

test('workspace reuses only same-request authenticated sites, preserving legacy adapter',async()=>{
  let context={actor:{id:'employee',role:'employee',mode:'clerk'},sites:[{id:'owned-site'}]},lists=0;
  const {readStudioWorkspace}=tsLoader({
    './auth':{currentStudioContext:async(_request,includeSites)=>{assert.equal(includeSites,true);return context;}},
    './platform-ops':{listSites:async actor=>{assert.equal(actor.id,'employee');lists++;return [{id:'legacy-owned'}];}},
    './auth-config':{authMode:()=> 'clerk',clerkAvailable:()=>true},'./demo-auth':{demoEnabled:()=>false},
  })(new URL('../src/lib/studio-workspace.ts',import.meta.url));
  const request=new Request('https://studio.example.test/api/workspace');
  assert.deepEqual((await readStudioWorkspace(request)).sites,[{id:'owned-site'}]);assert.equal(lists,0);
  context={actor:null};
  assert.deepEqual(await readStudioWorkspace(request),{auth:{signedIn:false,role:null,provider:'clerk',demoAvailable:false,available:true},sites:[]});assert.equal(lists,0);
  context={actor:{id:'employee',role:'employee',mode:'clerk'}};
  assert.deepEqual((await readStudioWorkspace(request)).sites,[{id:'legacy-owned'}]);assert.equal(lists,1);
});

test('workspace routes deny the next request after revoke and never retain previous sites',async()=>{
  let reply={auth:{signedIn:true},sites:[{id:'owned'}]},failure;
  const auth={};
  const load=tsLoader({
    '@/lib/auth':auth,
    '@/lib/studio-workspace':{readStudioWorkspace:async()=>{if(failure) throw failure;return reply;},workspaceAuth:()=>({signedIn:false})},
  });
  const {AuthError}=load(new URL('../src/lib/auth-policy.ts',import.meta.url));auth.AuthError=AuthError;
  const {GET}=load(new URL('../src/app/api/workspace/route.ts',import.meta.url));
  const request=new Request('https://studio.example.test/api/workspace');
  let response=await GET(request);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal((await response.json()).sites.length,1);
  failure=new AuthError(403);
  response=await GET(request);assert.deepEqual(await response.json(),{auth:{signedIn:false,denied:true},sites:[]});
  failure=new AuthError(503,'Identity unavailable');
  response=await GET(request);assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'Identity unavailable'});
  failure=undefined;reply={auth:{signedIn:false},sites:[]};
  assert.deepEqual(await (await GET(request)).json(),reply);
});

test('site reload uses the authenticated workspace once and rejects guests',async()=>{
  let signedIn=true,calls=0;
  const load=tsLoader({'@/lib/studio-workspace':{readStudioWorkspace:async()=>{calls++;return {auth:{signedIn},sites:signedIn?[{id:'owned'}]:[]};}}});
  const {GET}=load(new URL('../src/app/api/sites/route.ts',import.meta.url));
  const request=new Request('https://studio.example.test/api/sites');
  assert.deepEqual(await (await GET(request)).json(),{sites:[{id:'owned'}]});assert.equal(calls,1);
  signedIn=false;const response=await GET(request);assert.equal(response.status,401);assert.equal(calls,2);
});
