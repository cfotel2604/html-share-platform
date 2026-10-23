import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateKeyPairSync,sign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { verifyToken } from '@clerk/backend';
import { createActor } from '../../cloudflare/shared/auth.mjs';
import { reconcileExpired } from '../../cloudflare/shared/reconcile.mjs';
import { tsLoader } from '../helpers/load-ts.mjs';
import { harness } from './harness.mjs';

const load=tsLoader();
const {runPilotUpload}=load(new URL('../../src/lib/cloudflare-upload.ts',import.meta.url));
const {cloudflareClient}=load(new URL('../../src/lib/cloudflare-rpc.ts',import.meta.url));
const {clerkTokenProvider}=load(new URL('../../src/lib/cloudflare-token.ts',import.meta.url));
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const jwtKey=publicKey.export({type:'spki',format:'pem'});
const verify=(token,options)=>verifyToken(token,{...options,jwtKey}); // Default SDK clock skew.
function jwt(origin) {
  const now=Math.floor(Date.now()/1000),head=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  const payload=Buffer.from(JSON.stringify({iss:'https://clerk.synthetic.test',sub:'a',sid:'session_a',azp:origin,iat:now,nbf:now-5,exp:now+60})).toString('base64url');
  return head+'.'+payload+'.'+sign('RSA-SHA256',Buffer.from(head+'.'+payload),privateKey).toString('base64url');
}
async function authenticated(t) {
  const h=await harness();t.after(()=>h.close());
  t.mock.timers.enable({apis:['Date'],now:Date.now()});
  const names=['CLOUDFLARE_API_ORIGIN','CLOUDFLARE_SERVICE_TOKEN','CLERK_SECRET_KEY'],old=names.map(k=>process.env[k]);
  Object.assign(process.env,{CLOUDFLARE_API_ORIGIN:h.vars.API_ORIGIN,CLOUDFLARE_SERVICE_TOKEN:h.vars.HSP_SERVICE_TOKEN,CLERK_SECRET_KEY:'sk_test_synthetic'});
  t.after(()=>names.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]));
  const state={active:true,minted:[],events:[],afterRead:async()=>{},loseAck:false,revokeAtFinalize:false};
  const user={id:'a',primaryEmailAddressId:'e',banned:false,locked:false,
    emailAddresses:[{id:'e',emailAddress:'a@example.test',verification:{status:'verified'}}],
    externalAccounts:[{provider:'oauth_google',emailAddress:'a@example.test'}]};
  const api={sessions:{
    getSession:async id=>{assert.equal(id,'session_a');return {userId:'a',status:state.active?'active':'revoked',expireAt:Date.now()+3600_000};},
    getToken:async(...args)=>{assert.deepEqual(args,['session_a']);const token=jwt(h.vars.STUDIO_ORIGIN);state.minted.push(token);return {jwt:token};},
  },users:{getUser:async()=>user}};
  const authenticate=createActor({verify,client:()=>api});
  const original=jwt(h.vars.STUDIO_ORIGIN);
  const provider=clerkTokenProvider({userId:'a',sessionId:'session_a',origin:h.vars.STUDIO_ORIGIN,token:original},{verify,client:()=>api});
  const rpc=cloudflareClient(provider,async(url,options)=>{
    const path=new URL(url).pathname,token=options.headers.Authorization.slice(7);
    state.events.push({path,token,key:options.headers['Idempotency-Key']});
    if(path.endsWith('/finalize')&&state.revokeAtFinalize) state.active=false;
    try {await authenticate(new Request(url,options),{...h.vars,DB:h.db,CLERK_SECRET_KEY:'sk_test_synthetic'});}
    catch(error) {return Response.json({error:'denied'},{status:error.status??503});}
    const res=await h.api(path,{method:options.method,body:options.body?JSON.parse(options.body):undefined,key:options.headers['Idempotency-Key']});
    if(path==='/v1/uploads'&&res.ok) state.intent=await res.clone().json();
    if(path.endsWith('/finalize')&&state.loseAck&&res.ok) {
      t.mock.timers.tick(70_000); // The ACK is lost, then the JWT expires before retry/recovery.
      throw new Error('synthetic lost acknowledgement');
    }
    return res;
  });
  const store={
    async put(key,body){return (await h.bucket.put(key,body)).etag;},
    async read(key){const obj=await h.bucket.get(key);await state.afterRead();return {etag:obj.etag,body:obj.body};},
  };
  const upload=()=>runPilotUpload(rpc,store,new File(['synthetic lifecycle asset'],'index.html'),'Lifecycle fixture');
  const versions=async()=>Number((await h.db.prepare('SELECT count(*) AS n FROM site_versions').first()).n);
  return {h,state,original,upload,versions};
}

test('R1: expired captured JWT is replaced for the same session and finalize succeeds',async t=>{
  const f=await authenticated(t);
  f.state.afterRead=async()=>t.mock.timers.tick(70_000);
  const result=await f.upload();assert.ok(result.id);assert.equal(await f.versions(),1);
  await assert.rejects(()=>verify(f.original,{authorizedParties:[f.h.vars.STUDIO_ORIGIN]}));
  const final=f.state.events.find(e=>e.path.endsWith('/finalize'));
  assert.notEqual(final.token,f.original);assert.ok(f.state.minted.includes(final.token));
  const claims=await verify(final.token,{authorizedParties:[f.h.vars.STUDIO_ORIGIN]});
  assert.equal(claims.sub,'a');assert.equal(claims.sid,'session_a');
});

test('R1: lost ACK retries and receipt recovery refresh JWTs without changing finalize key',async t=>{
  const f=await authenticated(t);f.state.loseAck=true;
  f.state.afterRead=async()=>t.mock.timers.tick(70_000);
  const result=await f.upload();assert.ok(result.id);assert.equal(await f.versions(),1);
  const finals=f.state.events.filter(e=>e.path.endsWith('/finalize'));
  const recovered=f.state.events.find(e=>e.path.startsWith('/v1/receipts/'));
  assert.equal(finals.length,2);assert.equal(finals[0].key,finals[1].key);
  assert.equal(recovered.path,'/v1/receipts/'+finals[0].key);
  assert.notEqual(finals[0].token,finals[1].token);assert.notEqual(recovered.token,finals[1].token);
  assert.ok(!f.state.events.some(e=>/\/(abort|cleanup)$/.test(e.path)));
  assert.equal(Number((await f.h.db.prepare("SELECT count(*) AS n FROM audit_events WHERE action LIKE 'upload.finalize:%'").first()).n),1);
  // An ambiguous commit that succeeded is never an orphan candidate.
  assert.equal((await reconcileExpired({DB:f.h.db,ASSETS:f.h.bucket},{dryRun:false})).cleaned,0);
  assert.equal((await f.h.bucket.list({prefix:f.state.intent.storagePrefix+'/'})).objects.length,1);
});

test('R1: revoked session during upload cannot mint or finalize with a fresh token',async t=>{
  const f=await authenticated(t);
  f.state.afterRead=async()=>{t.mock.timers.tick(70_000);f.state.active=false;};
  await assert.rejects(f.upload,e=>e.status===503);
  assert.equal(f.state.minted.length,0);assert.equal(await f.versions(),0);
  assert.equal((await f.h.bucket.list({prefix:f.state.intent.storagePrefix+'/'})).objects.length,1);
});

test('R1: user disabled during upload is denied by Worker policy despite a fresh signed JWT',async t=>{
  const f=await authenticated(t);
  f.state.afterRead=async()=>{t.mock.timers.tick(70_000);await f.h.db.prepare("UPDATE users SET status='disabled' WHERE id='a'").run();};
  await assert.rejects(f.upload,e=>e.status===503);
  assert.ok(f.state.minted.length>0);assert.equal(await f.versions(),0);
});

test('R1: revocation after mint is still rejected by the Worker online session check',async t=>{
  const f=await authenticated(t);f.state.revokeAtFinalize=true;
  f.state.afterRead=async()=>t.mock.timers.tick(70_000);
  await assert.rejects(f.upload,e=>e.status===503);
  assert.ok(f.state.minted.length>0);assert.equal(await f.versions(),0);
});

test('R2: automatic resweep removes a late PUT even after a successful cleanup marker',async t=>{
  const h=await harness();t.after(()=>h.close());t.mock.timers.enable({apis:['Date'],now:Date.now()});
  let intent;
  const rpc=async(path,method='GET',body,key)=>{
    const res=await h.api(path,{method,body,key});if(!res.ok) throw new Error('fixture denial');
    const data=await res.json();if(path==='/v1/uploads') intent=data;return data;
  };
  const env={DB:h.db,ASSETS:h.bucket};
  const store={async put(key,body){
    await h.db.prepare('UPDATE upload_intents SET expires_at=? WHERE id=?').bind(new Date(Date.now()-1).toISOString(),intent.id).run();
    assert.equal((await reconcileExpired(env,{dryRun:false})).cleaned,1);
    assert.ok((await h.db.prepare('SELECT cleanup_at FROM upload_intents WHERE id=?').bind(intent.id).first()).cleanup_at);
    return (await h.bucket.put(key,body)).etag;
  },async read(key){const obj=await h.bucket.get(key);return {etag:obj.etag,body:obj.body};}};
  await assert.rejects(()=>runPilotUpload(rpc,store,new File(['late private asset'],'index.html'),'Late writer'),e=>e.status===503);
  assert.equal((await h.bucket.list({prefix:intent.storagePrefix+'/'})).objects.length,1);
  assert.equal((await reconcileExpired(env,{dryRun:false})).candidates,0); // Backoff, not a terminal exclusion.
  t.mock.timers.tick(5*60_000+1);
  assert.equal((await reconcileExpired(env,{dryRun:false})).cleaned,1);
  assert.equal((await h.bucket.list({prefix:intent.storagePrefix+'/'})).objects.length,0);
  // A much later completion is still collected after the daily backoff.
  t.mock.timers.tick(2*24*60*60_000);
  await reconcileExpired(env,{dryRun:false});
  await h.bucket.put(intent.storagePrefix+'/index.html','very late private asset');
  t.mock.timers.tick(24*60*60_000+1);
  assert.equal((await reconcileExpired(env,{dryRun:false})).cleaned,1);
  assert.equal((await h.bucket.list({prefix:intent.storagePrefix+'/'})).objects.length,0);
});

test('R2: interrupted sweep remains discoverable; committed and preview-referenced objects survive',async t=>{
  const h=await harness();t.after(()=>h.close());t.mock.timers.enable({apis:['Date'],now:Date.now()});
  const orphan=await h.upload(),committed=await h.publish();
  await h.api('/v1/sites/'+committed.site.id,{method:'PATCH',body:{published:false}});
  const preview=await (await h.api('/v1/sites/'+committed.site.id+'/preview',{method:'POST'})).json();
  await h.db.prepare('UPDATE upload_intents SET expires_at=? WHERE id=?').bind(new Date(Date.now()-1).toISOString(),orphan.intent.id).run();
  // Even an inconsistent aborted intent must never delete a committed version/grant.
  await h.db.prepare("UPDATE upload_intents SET state='aborted',cleanup_after='2000-01-01T00:00:00.000Z' WHERE id=?").bind(committed.intent.id).run();
  assert.equal((await reconcileExpired({DB:h.db,ASSETS:h.bucket},{dryRun:false})).cleaned,1);
  const first=await h.db.prepare('SELECT cleanup_at,cleanup_after FROM upload_intents WHERE id=?').bind(orphan.intent.id).first();
  await h.bucket.put(orphan.intent.storagePrefix+'/late-a.txt','late private asset');
  await h.bucket.put(orphan.intent.storagePrefix+'/late-b.txt','late private asset');
  t.mock.timers.tick(Math.max(0,Date.parse(first.cleanup_after)-Date.now()+1));
  const broken={DB:h.db,ASSETS:{list:options=>h.bucket.list(options),async delete(keys){
    await h.bucket.delete(keys[0]);throw new Error('synthetic process interruption after partial delete');
  }}};
  assert.equal((await reconcileExpired(broken,{dryRun:false})).failed,1);
  const row=await h.db.prepare('SELECT state,cleanup_at,cleanup_after FROM upload_intents WHERE id=?').bind(orphan.intent.id).first();
  assert.equal(row.state,'aborted');assert.equal(row.cleanup_at,first.cleanup_at);assert.equal(row.cleanup_after,first.cleanup_after);
  const freshInvocation=await reconcileExpired({DB:h.db,ASSETS:h.bucket},{dryRun:false});
  assert.equal(freshInvocation.cleaned,1);
  assert.equal((await h.bucket.list({prefix:orphan.intent.storagePrefix+'/'})).objects.length,0);
  assert.ok(await h.bucket.head(committed.intent.storagePrefix+'/index.html'));
  assert.equal((await h.previewWorker.fetch(preview.url)).status,200);
});

test('R2: bounded scans do not starve a second intent behind already-swept tombstones',async t=>{
  const h=await harness();t.after(()=>h.close());
  const a=await h.upload(),b=await h.upload();
  await h.db.prepare("UPDATE upload_intents SET expires_at='2000-01-01T00:00:00.000Z'").run();
  const env={DB:h.db,ASSETS:h.bucket};
  assert.equal((await reconcileExpired(env,{dryRun:false,limit:1})).cleaned,1);
  assert.equal((await reconcileExpired(env,{dryRun:false,limit:1})).cleaned,1);
  assert.equal((await reconcileExpired(env,{dryRun:false,limit:1})).candidates,0);
  for(const f of [a,b]) assert.equal((await h.bucket.list({prefix:f.intent.storagePrefix+'/'})).objects.length,0);
});

test('R2: additive D1 migration makes previously marked aborted intents eligible again',async t=>{
  const h=await harness({migrationsThrough:'0002_cleanup.sql'});t.after(()=>h.close());
  const old=await h.upload();
  await h.db.prepare("UPDATE upload_intents SET state='aborted',cleanup_at='2000-01-01T00:00:00.000Z' WHERE id=?").bind(old.intent.id).run();
  const sql=await readFile(new URL('../../cloudflare/migrations/0003_cleanup_resweeps.sql',import.meta.url),'utf8');
  for(const part of sql.replace(/^--.*$/gm,'').split(';').filter(p=>p.trim())) await h.db.prepare(part).run();
  const row=await h.db.prepare('SELECT cleanup_at,cleanup_after FROM upload_intents WHERE id=?').bind(old.intent.id).first();
  assert.equal(row.cleanup_after,row.cleanup_at);
  assert.equal((await reconcileExpired({DB:h.db,ASSETS:h.bucket},{dryRun:false})).cleaned,1);
  assert.equal((await h.bucket.list({prefix:old.intent.storagePrefix+'/'})).objects.length,0);
});

test('R2: a provider PUT finishing after the Node deadline is collected by automatic resweep',async t=>{
  const h=await harness();t.after(()=>h.close());t.mock.timers.enable({apis:['Date'],now:Date.now()});
  let intent,release,lateDone,operation;
  const rpc=async(path,method='GET',body,key)=>{
    const res=await h.api(path,{method,body,key});if(!res.ok) throw new Error('fixture denial');
    const data=await res.json();if(path==='/v1/uploads') intent=data;return data;
  };
  const gate=new Promise(resolve=>{release=resolve;});
  const store={put(key,body,_type,signal){
    operation=signal;lateDone=(async()=>{await gate;return (await h.bucket.put(key,body)).etag;})();return lateDone;
  },async read(){throw new Error('readback must not run after timed-out PUT');}};
  await assert.rejects(()=>runPilotUpload(rpc,store,new File(['late completion'],'index.html'),'Deadline fixture',undefined,{objectTimeoutMs:20}),e=>e.status===503);
  assert.equal(operation.aborted,true);
  const swept=await h.db.prepare('SELECT cleanup_at,cleanup_after FROM upload_intents WHERE id=?').bind(intent.id).first();
  assert.ok(swept.cleanup_at);
  release();await lateDone;
  assert.equal((await h.bucket.list({prefix:intent.storagePrefix+'/'})).objects.length,1);
  // The API Worker has its own real clock; advance past its persisted due time.
  t.mock.timers.tick(Math.max(0,Date.parse(swept.cleanup_after)-Date.now()+1));
  assert.equal((await reconcileExpired({DB:h.db,ASSETS:h.bucket},{dryRun:false})).cleaned,1);
  assert.equal((await h.bucket.list({prefix:intent.storagePrefix+'/'})).objects.length,0);
  assert.equal(await h.db.prepare('SELECT id FROM site_versions WHERE id=?').bind(intent.versionId).first(),null);
});

test('upload write deadline rejects an expired intent before any R2 operation',async t=>{
  const h=await harness();t.after(()=>h.close());let writes=0;
  const rpc=async(path,method='GET',body,key)=>{
    const res=await h.api(path,{method,body,key});assert.ok(res.ok);const data=await res.json();
    if(path==='/v1/uploads') data.expiresAt=new Date(Date.now()-1).toISOString();return data;
  };
  await assert.rejects(()=>runPilotUpload(rpc,{async put(){writes++;}},new File(['body'],'index.html'),'Expired intent'),e=>e.status===409);
  assert.equal(writes,0);
});

test('stalled readback respects the total upload deadline and never attempts finalize',async t=>{
  const h=await harness();t.after(()=>h.close());const paths=[];let reading;
  const rpc=async(path,method='GET',body,key)=>{
    paths.push(path);const res=await h.api(path,{method,body,key});assert.ok(res.ok);return res.json();
  };
  const store={async put(key,body){return (await h.bucket.put(key,body)).etag;},async read(key,_etag,signal){
    reading=signal;const obj=await h.bucket.head(key);return {etag:obj.etag,body:(async function*(){
      yield Buffer.from('body');await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));signal.throwIfAborted();
    })()};
  }};
  await assert.rejects(()=>runPilotUpload(rpc,store,new File(['body'],'index.html'),'Stalled read',undefined,{timeoutMs:500}),e=>e.status===503);
  assert.equal(reading.aborted,true);assert.ok(!paths.some(p=>p.endsWith('/finalize')));
});
