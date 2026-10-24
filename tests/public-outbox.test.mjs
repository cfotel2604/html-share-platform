import assert from 'node:assert/strict';
import { after,before,test } from 'node:test';
import { localPostgres,localD1,seedActor,nodeServices } from './helpers/public-projection.mjs';
import { projectOnce,projectionMetrics,ProjectionError,bindProjectorTarget } from '../scripts/lib/public-projector.mjs';

let pg,d1,services,actor,site;
before(async()=>{
  pg=await localPostgres();d1=await localD1();
  actor={...await seedActor(pg.pool),mode:'clerk'};services=nodeServices(pg.pool);
});
after(async()=>{await d1?.close();await pg?.close();});
const events=async()=> (await pg.pool.query('SELECT * FROM public_projection_outbox ORDER BY id')).rows;
async function advanceTestClock() { // Test-only simulation of the next durable slot; production cannot bypass the5s minimum.
  await pg.pool.query("UPDATE public_projection_control SET next_request_at='-infinity'");
}

test('empty PostgreSQL migration adds outbox without touching applied SQL; source rollback rolls back its event',async()=>{
  await pg.pool.query('BEGIN');
  const id='b'.repeat(32);
  await pg.pool.query("INSERT INTO sites(id,owner_id,display_name)VALUES($1,$2,'Synthetic')",[id,actor.id]);
  await pg.pool.query("INSERT INTO site_share_links(code,site_id)VALUES('Rollback12',$1)",[id]);
  assert.equal((await events()).length,1);
  await pg.pool.query('ROLLBACK');
  assert.equal((await events()).length,0);
});

test('projector off: Node upload+revoke commit atomically; restart applies FIFO and final revoked never resurrects',async()=>{
  site=await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>synthetic</p>'],'synthetic.html'),'Synthetic'));
  const code=(await pg.pool.query('SELECT code FROM site_share_links WHERE site_id=$1',[site.id])).rows[0].code;
  await services.links.changeShareLink(actor,site.id,'revoke');
  const pending=await events();assert.equal(pending.length,2);assert.ok(pending.every(row=>row.state==='pending'&&row.payload));
  assert.deepEqual(pending.map(row=>row.payload[0].status),['published','revoked']);
  assert.equal(d1.calls.length,0);
  assert.equal((await projectOnce(pg.pool,d1.send)).state,'projected');
  assert.equal((await d1.db.prepare('SELECT status FROM public_read_model WHERE share_code=?').bind(code).first()).status,'published');
  const throttle=await projectOnce(pg.pool,d1.send);assert.equal(throttle.state,'throttled');assert.equal(d1.calls.length,1);
  await advanceTestClock();
  assert.equal((await projectOnce(pg.pool,d1.send)).state,'projected');
  assert.equal((await d1.db.prepare('SELECT status FROM public_read_model WHERE share_code=?').bind(code).first()).status,'revoked');
  const tombstone=await d1.db.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(code).first();
  await d1.send(pending[0]);await d1.send(pending[1]);
  assert.deepEqual(await d1.db.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(code).first(),tombstone);
  assert.deepEqual(d1.history.slice(0,2).map(batch=>batch[0].status),['published','revoked']);
});

test('rotation coalesces old tombstone and new publication in one batch, with only public fields',async()=>{
  const rotated=await services.links.changeShareLink(actor,site.id,'rotate');
  await advanceTestClock();await projectOnce(pg.pool,d1.send);
  const initial=(await events()).at(-1);assert.equal(initial.payload.length,1); // Reissue after revoke has no live old code.
  await services.links.changeShareLink(actor,site.id,'rotate');
  const event=(await events()).at(-1);assert.equal(event.payload.length,2);assert.equal(event.priority,true);
  assert.deepEqual(event.payload.map(row=>row.status),['revoked','published']);
  await advanceTestClock();const previous=d1.calls.length;await projectOnce(pg.pool,d1.send);
  assert.equal(d1.calls.length,previous+1);assert.equal(d1.calls.at(-1).batch.length,2);
  assert.equal((await d1.db.prepare('SELECT status FROM public_read_model WHERE share_code=?').bind(rotated.share_code).first()).status,'revoked');
  for(const row of event.payload) {
    assert.deepEqual(Object.keys(row).sort(),['active_version','manifest','projection_version','share_code','site_id','status','updated_at']);
    for(const asset of row.manifest)assert.deepEqual(Object.keys(asset).sort(),['etag','path','r2_key','size']);
  }
});

test('429 retains the event, alerts with sanitized code, and freezes the job across calls',async()=>{
  await services.ops.setPublished(actor,site.id,false);
  await advanceTestClock();d1.fail(()=>new Response('SYNTHETIC_SECRET_BODY',{status:429,headers:{'Retry-After':'600'}}));
  const logs=[];const before=d1.calls.length;
  const result=await projectOnce(pg.pool,d1.send,{log:value=>logs.push(value)});
  assert.equal(result.state,'retry');assert.equal(result.error_code,'rate_limited');assert.ok(result.retry_ms>=600000);
  assert.equal((await events()).at(-1).state,'pending');assert.equal((await events()).at(-1).last_error,'rate_limited');
  assert.equal((await projectOnce(pg.pool,d1.send)).state,'idle'); // Failed head is in backoff; nothing eligible.
  await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>other</p>'],'synthetic.html'),'Other'));
  assert.equal((await projectOnce(pg.pool,d1.send)).state,'throttled'); // Shared429 cooldown also blocks a different eligible site.
  assert.equal(d1.calls.length,before+1);assert.ok(!JSON.stringify(logs).includes('SECRET'));
  d1.fail(undefined);
  await pg.pool.query("UPDATE public_projection_outbox SET next_attempt_at='-infinity' WHERE state='pending'");
  await advanceTestClock();assert.equal((await projectOnce(pg.pool,d1.send)).state,'projected');
  await advanceTestClock();assert.equal((await projectOnce(pg.pool,d1.send)).state,'projected');
  const metrics=await projectionMetrics(pg.pool);assert.equal(metrics.pending,0);
});

test('commit-time snapshot coalesces final transaction state, including SET CONSTRAINTS IMMEDIATE',async()=>{
  const code=(await pg.pool.query('SELECT code FROM site_share_links WHERE site_id=$1 AND revoked_at IS NULL',[site.id])).rows[0].code;
  const previous=(await events()).length;
  await pg.pool.query('BEGIN');
  await pg.pool.query("UPDATE sites SET status='published' WHERE id=$1",[site.id]);
  await pg.pool.query('SET CONSTRAINTS ALL IMMEDIATE');
  await pg.pool.query("UPDATE sites SET status='unpublished' WHERE id=$1",[site.id]);
  await pg.pool.query('COMMIT');
  const current=await events();assert.equal(current.length,previous+1);
  assert.equal(current.at(-1).payload.find(row=>row.share_code===code).status,'unpublished');
  assert.equal(current.at(-1).priority,true);
});

test('pending revocation chains outrank other sites while preserving per-site FIFO',async()=>{
  const other=await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>low</p>'],'synthetic.html'),'Low'));
  await services.ops.setPublished(actor,site.id,true);
  await services.links.changeShareLink(actor,site.id,'revoke');
  const remaining=(await events()).filter(row=>row.state==='pending');
  assert.ok(remaining.some(row=>row.site_id===other.id));
  await advanceTestClock();const start=d1.history.length;await projectOnce(pg.pool,d1.send);
  const applied=d1.history[start];
  assert.equal(applied[0].code,remaining.find(row=>row.site_id===site.id).payload[0].share_code);
  while((await projectionMetrics(pg.pool)).pending) {await advanceTestClock();assert.equal((await projectOnce(pg.pool,d1.send)).state,'projected');}
});

test('revocation age warning remains explicitly a proposal and emits no private payload',async()=>{
  const ageSite=await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>age</p>'],'synthetic.html'),'Age'));
  await services.links.changeShareLink(actor,ageSite.id,'revoke');
  const pending=(await events()).at(-1);
  await pg.pool.query("UPDATE public_projection_outbox SET priority=true,enqueued_at=clock_timestamp()-interval '61 seconds' WHERE id=$1",[pending.id]);
  const metrics=await projectionMetrics(pg.pool);
  assert.equal(metrics.revoke_threshold_proposal_ms,60000);assert.equal(metrics.revoke_over_proposal,true);
  assert.ok(!JSON.stringify(metrics).includes(pending.site_id));
});

test('Admin sees pending status; Employee DTO excludes outbox/operational metadata',async()=>{
  const admin={...await seedActor(pg.pool,'admin','admin'),mode:'clerk'};
  const adminSites=await services.ops.listSites(admin);
  assert.ok(adminSites.some(item=>item.projection?.pending));
  assert.ok(adminSites.some(item=>item.projection?.revoke_overdue===true));
  const employeeSites=await services.ops.listSites(actor);
  assert.ok(employeeSites.length);assert.ok(employeeSites.every(item=>!Object.hasOwn(item,'projection')));
  assert.ok(!JSON.stringify(adminSites).includes('SYNTHETIC_SECRET_BODY'));
});

test('lost D1 acknowledgement leaves durable pending event; replay recovers without duplicate effect',async()=>{
  while((await projectionMetrics(pg.pool)).pending){await advanceTestClock();await projectOnce(pg.pool,d1.send);}
  const created=await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>lost</p>'],'synthetic.html'),'Lost'));
  await advanceTestClock();
  const result=await projectOnce(pg.pool,async event=>{await d1.send(event);throw new ProjectionError('network');});
  assert.equal(result.state,'retry');
  const event=(await events()).at(-1);assert.equal(event.site_id,created.id);assert.equal(event.state,'pending');
  const code=event.payload[0].share_code;
  const before=await d1.db.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(code).first();
  await pg.pool.query("UPDATE public_projection_outbox SET next_attempt_at='-infinity' WHERE id=$1",[event.id]);
  await advanceTestClock();assert.equal((await projectOnce(pg.pool,d1.send)).state,'projected');
  assert.deepEqual(await d1.db.prepare('SELECT * FROM public_read_model WHERE share_code=?').bind(code).first(),before);
  assert.equal((await events()).at(-1).attempts,2);
});

test('legacy publication without verified ETag fails source commit atomically; denial remains available',async()=>{
  const created=await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>legacy</p>'],'synthetic.html'),'Legacy'));
  await services.ops.setPublished(actor,created.id,false);
  await pg.pool.query("UPDATE site_versions SET asset_manifest=(SELECT jsonb_agg(a-'etag')FROM jsonb_array_elements(asset_manifest)a)WHERE id=(SELECT active_version_id FROM sites WHERE id=$1)",[created.id]);
  const count=(await events()).length;
  await assert.rejects(services.ops.setPublished(actor,created.id,true),/verified manifest/);
  assert.equal((await events()).length,count);
  assert.equal((await pg.pool.query('SELECT status FROM sites WHERE id=$1',[created.id])).rows[0].status,'unpublished');
  await services.links.changeShareLink(actor,created.id,'revoke');
  assert.equal((await events()).at(-1).payload[0].status,'revoked');
});

test('target pin survives restarts and rejects a different database/account fingerprint',async()=>{
  await bindProjectorTarget(pg.pool,d1.send.targetFingerprint);
  await bindProjectorTarget(pg.pool,d1.send.targetFingerprint);
  await assert.rejects(bindProjectorTarget(pg.pool,'f'.repeat(64)),error=>error.code==='target_mismatch');
});

test('unknown error codes are redacted; revoked-token403 alerts and retains the queue with shared cooldown',async()=>{
  while((await projectionMetrics(pg.pool)).pending){await advanceTestClock();await projectOnce(pg.pool,d1.send);}
  await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>auth</p>'],'synthetic.html'),'Auth'));
  await advanceTestClock();const logs=[];
  const secret='synthetic_lowercase_secret';
  const failed=await projectOnce(pg.pool,async()=>{throw new ProjectionError(secret);},{log:value=>logs.push(value)});
  assert.equal(failed.error_code,'transport_failed');assert.ok(!JSON.stringify(logs).includes(secret));
  await pg.pool.query("UPDATE public_projection_outbox SET next_attempt_at='-infinity' WHERE state='pending'");
  await advanceTestClock();d1.fail(()=>new Response(secret,{status:403}));
  const auth=await projectOnce(pg.pool,d1.send,{log:value=>logs.push(value)});
  assert.equal(auth.event,'projector.auth_failed');assert.ok(auth.retry_ms>=300000);
  assert.equal((await events()).at(-1).state,'pending');assert.equal((await events()).at(-1).last_error,'http_403');
  assert.ok(!JSON.stringify(logs).includes(secret));d1.fail(undefined);
});
