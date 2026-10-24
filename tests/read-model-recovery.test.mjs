import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { localPostgres,localD1,seedActor,nodeServices } from './helpers/public-projection.mjs';
import { planRecovery,publicRecoveryPlan,enqueueRecovery,applyRecovery,recoveryReadPage } from '../scripts/lib/read-model-recovery.mjs';
import { projectOnce,createD1Writer,ProjectionError } from '../scripts/lib/public-projector.mjs';
import { recoveryOptions,runRecovery } from '../scripts/recover-public-read-model.mjs';

let pg,d1,services,admin,employee,site,plan;
before(async()=>{
  pg=await localPostgres();d1=await localD1();services=nodeServices(pg.pool);
  admin={...await seedActor(pg.pool,'recovery-admin','admin'),mode:'clerk'};
  employee={...await seedActor(pg.pool,'recovery-employee'),mode:'clerk'};
  site=await services.run(()=>services.ops.uploadVersion(admin,new File(['<p>synthetic</p>'],'synthetic.html'),'Synthetic'));
});
after(async()=>{await d1?.close();await pg?.close();});
const clear=()=>pg.pool.query("UPDATE public_projection_control SET next_request_at='-infinity'");
// Speed up non-timing tests only after production REST has reserved a real slot.
// The separate throttle test below uses the unmodified sender.
const fastSend=async event=>{try{return await d1.send(event);}finally{await clear();}};
Object.defineProperties(fastSend,{targetFingerprint:{get:()=>d1.send.targetFingerprint},readPage:{value:async cursor=>{try{return await d1.send.readPage(cursor);}finally{await clear();}}}});
async function drain(){for(;;){await clear();const result=await projectOnce(pg.pool,d1.send);if(result.state==='idle')break;assert.equal(result.state,'projected');}}

test('recovery disabled/approval/parser guards run before any database/provider client',async()=>{
  await assert.rejects(runRecovery(['rebuild','--dry-run'],{}),error=>error.code==='recovery_disabled');
  const env={READ_MODEL_RECOVERY_ENABLED:'1'};
  for(const args of [[],['rebuild'],['rebuild','--apply','--plan','a'.repeat(64)],['reconcile','--apply','--plan','a'.repeat(64)],['rebuild','--dry-run','--apply'],['rebuild','--dry-run','--unknown']]){
    assert.throws(()=>recoveryOptions(args,env));
  }
  assert.equal(recoveryOptions(['reconcile','--dry-run'],env).apply,false);
});

test('dry-run against empty D1 prints a redacted diff without source/outbox/audit/D1 writes',async()=>{
  const before=(await pg.pool.query('SELECT count(*)::int n FROM public_projection_outbox')).rows[0].n;
  await clear();plan=await planRecovery(pg.pool,fastSend,{mode:'rebuild'});
  assert.equal(plan.blocked,false);assert.equal(plan.differences.length,1);assert.equal(d1.calls.length,0);
  assert.equal((await pg.pool.query('SELECT count(*)::int n FROM public_projection_outbox')).rows[0].n,before);
  assert.equal((await pg.pool.query("SELECT count(*)::int n FROM audit_events WHERE target_type='public-recovery'")).rows[0].n,0);
  const report=JSON.stringify(publicRecoveryPlan(plan));assert.ok(!report.includes(site.id));assert.ok(!report.includes('synthetic.html'));
  assert.ok(!report.includes(plan.selected[0].share_code));
});

test('reviewed rebuild fills empty D1 via existing projector; public snapshot and audit match source',async()=>{
  const result=await applyRecovery(pg.pool,fastSend,plan,{fingerprint:plan.fingerprint,operatorId:admin.id});
  assert.equal(result.state,'projected');
  const check=await planRecovery(pg.pool,fastSend);assert.equal(check.differences.length,0);
  const audit=(await pg.pool.query("SELECT * FROM audit_events WHERE target_type='public-recovery'")).rows;
  assert.equal(audit.length,1);assert.equal(audit[0].actor_id,admin.id);assert.equal(audit[0].action,'public.rebuild');
  assert.match(audit[0].target_id,new RegExp('^'+plan.fingerprint+':\\d+$'));
});

test('reconcile detects deliberate valid drift and repairs with a fresh higher PostgreSQL revision',async()=>{
  const row=(await d1.db.prepare('SELECT * FROM public_read_model').all()).results[0];
  await d1.db.prepare("UPDATE public_read_model SET status='unpublished',active_version=NULL,manifest='[]',projection_version=projection_version+1 WHERE share_code=?").bind(row.share_code).run();
  // Allocate a newer unrelated SOURCE event, never reset/derive a sequence from D1.
  await services.run(()=>services.ops.uploadVersion(admin,new File(['<p>other</p>'],'synthetic.html'),'Other'));await drain();
  const repair=await planRecovery(pg.pool,fastSend);assert.equal(repair.blocked,false);
  assert.ok(repair.differences.some(item=>item.fields.includes('status')));
  await assert.rejects(applyRecovery(pg.pool,fastSend,repair,{fingerprint:'f'.repeat(64),operatorId:admin.id}),error=>error.code==='plan_changed');
  assert.equal((await applyRecovery(pg.pool,fastSend,repair,{fingerprint:repair.fingerprint,operatorId:admin.id})).state,'projected');
  assert.equal((await planRecovery(pg.pool,fastSend)).differences.length,0);
});

test('source changes after reviewed plan abort enqueue under site lock, with no recovery audit/event',async()=>{
  const reviewed=await planRecovery(pg.pool,fastSend,{mode:'rebuild'});
  await services.ops.setPublished(admin,site.id,false);
  const count=(await pg.pool.query('SELECT count(*)::int n FROM public_projection_outbox')).rows[0].n;
  await assert.rejects(enqueueRecovery(pg.pool,reviewed,admin.id),error=>error.code==='source_changed');
  assert.equal((await pg.pool.query('SELECT count(*)::int n FROM public_projection_outbox')).rows[0].n,count);
  await drain();
});

test('non-admin/disabled policy cannot enqueue recovery; role checked at the Node operator boundary',async()=>{
  const reviewed=await planRecovery(pg.pool,fastSend,{mode:'rebuild'});
  await assert.rejects(enqueueRecovery(pg.pool,reviewed,employee.id),error=>error.code==='invalid_operator');
  await pg.pool.query("UPDATE auth_allowlist SET status='disabled' WHERE role='admin'");
  await assert.rejects(enqueueRecovery(pg.pool,reviewed,admin.id),error=>error.code==='invalid_operator');
  await pg.pool.query("UPDATE auth_allowlist SET status='active' WHERE role='admin'");
});

test('source mutation during paginated D1 reads makes reconciliation inconclusive',async()=>{
  const send=async()=>{};send.targetFingerprint=d1.send.targetFingerprint;
  send.readPage=async cursor=>{
    await services.ops.setPublished(admin,site.id,true);
    return d1.send.readPage(cursor);
  };
  await clear();await assert.rejects(planRecovery(pg.pool,send),error=>error.code==='source_changed');
  await services.ops.setPublished(admin,site.id,false);await drain();
});

test('reads share durable projector throttle and429 cooldown without leaking provider text',async()=>{
  await clear();assert.ok((await recoveryReadPage(pg.pool,d1.send)).rows);
  const reads=d1.reads.length;assert.ok((await recoveryReadPage(pg.pool,d1.send)).waitMs>0);assert.equal(d1.reads.length,reads);
  await clear();d1.fail(()=>new Response('SYNTHETIC_SECRET',{status:429,headers:{'Retry-After':'600'}}));
  await assert.rejects(recoveryReadPage(pg.pool,d1.send),error=>error.code==='rate_limited'&&!String(error).includes('SECRET'));
  assert.ok((await recoveryReadPage(pg.pool,d1.send)).waitMs>=599000);d1.fail(undefined);await clear();
});

test('irreparable identity/tombstone/unknown/ahead conflicts block all writes',async()=>{
  const base=(await planRecovery(pg.pool,fastSend)).selected;assert.deepEqual(base,[]);
  const source=await planRecovery(pg.pool,fastSend,{mode:'rebuild'});const row=source.selected[0];
  const stored=(await d1.db.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(row.share_code).first());
  for(const [reason,change] of [['identity_conflict',{site_id:'f'.repeat(32)}],['tombstone_conflict',{status:'revoked',active_version:null,manifest:'[]'}],['target_ahead',{projection_version:9007199254740991}]]){
    const fake=async()=>{};fake.targetFingerprint=d1.send.targetFingerprint;
    fake.readPage=async()=>[{...stored,...change}];
    await clear();const blocked=await planRecovery(pg.pool,fake);
    assert.ok(blocked.differences.some(item=>item.reason===reason));
    await assert.rejects(applyRecovery(pg.pool,fake,blocked,{fingerprint:blocked.fingerprint,operatorId:admin.id}),error=>error.code==='recovery_blocked');
  }
  const fake=async()=>{};fake.targetFingerprint=d1.send.targetFingerprint;fake.readPage=async()=>[{...stored,share_code:'Unknown123'}];
  await clear();assert.ok((await planRecovery(pg.pool,fake)).differences.some(item=>item.reason==='unknown_code'));
});

test('legacy bootstrap with no outbox and >100 tombstones/site uses bounded audited transactions',async()=>{
  const created=await services.run(()=>services.ops.uploadVersion(admin,new File(['<p>legacy</p>'],'synthetic.html'),'Legacy'));
  // Test-only fixture models a site predating the additive capture migration.
  await pg.pool.query('ALTER TABLE site_share_links DISABLE TRIGGER links_public_projection');
  for(let i=0;i<101;i++)await pg.pool.query("INSERT INTO site_share_links(code,site_id,revoked_at) VALUES($1,$2,now())",['Old'+String(i).padStart(7,'0'),created.id]);
  await pg.pool.query('ALTER TABLE site_share_links ENABLE TRIGGER links_public_projection');
  const reviewed=await planRecovery(pg.pool,fastSend,{mode:'rebuild'});
  const selected={...reviewed,selected:reviewed.selected.filter(row=>row.site_id===created.id)};
  const queued=await enqueueRecovery(pg.pool,selected,admin.id);assert.equal(queued.event_ids.length,2);
  assert.equal((await pg.pool.query('SELECT count(*)::int n FROM public_projection_outbox WHERE id=ANY($1::bigint[]) AND payload IS NOT NULL',[queued.event_ids])).rows[0].n,2);
  await drain();const readCount=d1.reads.length;
  const checked=await planRecovery(pg.pool,fastSend);assert.equal(checked.differences.length,0);
  assert.ok(d1.reads.length-readCount>=6); // Keyset pagination includes all101old tombstones.
});

test('unverified legacy ETag blocks rebuild before enqueue while denial remains repairable',async()=>{
  const created=await services.run(()=>services.ops.uploadVersion(admin,new File(['<p>etag</p>'],'synthetic.html'),'ETag'));
  await pg.pool.query("UPDATE site_versions SET asset_manifest=(SELECT jsonb_agg(a-'etag') FROM jsonb_array_elements(asset_manifest)a)WHERE site_id=$1",[created.id]);
  const blocked=await planRecovery(pg.pool,fastSend,{mode:'rebuild'});
  assert.ok(blocked.differences.some(item=>item.reason==='invalid_source_manifest'));
  await assert.rejects(enqueueRecovery(pg.pool,blocked,admin.id),error=>error.code==='recovery_blocked');
  await services.links.changeShareLink(admin,created.id,'revoke');
  assert.equal((await planRecovery(pg.pool,fastSend,{mode:'rebuild'})).blocked,false);
});

test('read API is closed SELECT only with bounded keyset pagination and verified unchanged-db metadata',async()=>{
  const send=createD1Writer({accountId:'a'.repeat(32),databaseId:'0'.repeat(36),token:'SYNTHETIC',fetcher:async(_url,request)=>{
    const batch=JSON.parse(request.body).batch;assert.equal(batch.length,1);assert.match(batch[0].sql,/SELECT share_code/);assert.match(batch[0].sql,/LIMIT 20/);assert.deepEqual(batch[0].params,['']);
    return Response.json({success:true,result:[{success:true,meta:{changed_db:true},results:[]}]});
  }});
  await assert.rejects(send.readPage(),error=>error.code==='invalid_response');
  await assert.rejects(send.readPage("'; DROP TABLE public_read_model"),error=>error instanceof ProjectionError);
});
