import assert from 'node:assert/strict';
import { before,after,test } from 'node:test';
import { setTimeout as sleep } from 'node:timers/promises';
import pg from 'pg';
import { localD1,seedActor,nodeServices } from '../helpers/public-projection.mjs';
import { measureProjection } from '../helpers/projection-benchmark.mjs';
import { projectOnce } from '../../scripts/lib/public-projector.mjs';

assert.equal(process.env.UPLOAD_TEST_GUARD,'isolated-public-outbox');
assert.equal(process.env.PGDATABASE,'outbox_test');
assert.ok(['127.0.0.1','localhost'].includes(process.env.PGHOST));
const pool=new pg.Pool({max:8}),services=nodeServices(pool);
let d1,actor,site;
before(async()=>{
  d1=await localD1();actor={...await seedActor(pool,'integration'),mode:'clerk'};
  site=await services.run(()=>services.ops.uploadVersion(actor,new File(['<p>synthetic</p>'],'synthetic.html'),'Synthetic'));
  await projectOnce(pool,d1.send);
});
after(async()=>{await d1?.close();await pool.end();});
const clearSlot=()=>pool.query("UPDATE public_projection_control SET next_request_at='-infinity'");

test('real PostgreSQL serializes source revisions/commit order and hides uncommitted events',async()=>{
  const a=await pool.connect(),b=await pool.connect();
  try {
    await a.query('BEGIN');await b.query('BEGIN');
    await a.query("UPDATE sites SET status='unpublished' WHERE id=$1",[site.id]);
    assert.equal((await pool.query("SELECT count(*)::int n FROM public_projection_outbox WHERE site_id=$1 AND state='pending'",[site.id])).rows[0].n,0);
    let finished=false;
    const rival=b.query("UPDATE sites SET status='published' WHERE id=$1",[site.id]).then(()=>{finished=true;});
    await sleep(100);assert.equal(finished,false);
    await a.query('COMMIT');await rival;await b.query('COMMIT');
    const rows=(await pool.query("SELECT * FROM public_projection_outbox WHERE site_id=$1 AND state='pending' ORDER BY id",[site.id])).rows;
    assert.equal(rows.length,2);assert.ok(BigInt(rows[0].id)<BigInt(rows[1].id));
    assert.deepEqual(rows.map(row=>row.payload[0].status),['unpublished','published']);
  } finally {await a.query('ROLLBACK').catch(()=>{});await b.query('ROLLBACK').catch(()=>{});a.release();b.release();}
});

test('real session advisory lock serializes projectors without holding the source transaction',async()=>{
  await clearSlot();let release,started;
  const began=new Promise(resolve=>{started=resolve;});const gate=new Promise(resolve=>{release=resolve;});
  const first=projectOnce(pool,async event=>{started();await gate;await d1.send(event);});
  await began;
  assert.equal((await projectOnce(pool,d1.send)).state,'contended');
  release();assert.equal((await first).state,'projected');
  await clearSlot();assert.equal((await projectOnce(pool,d1.send)).state,'projected');
});

test('real source publish+revoke while projector off drains FIFO; replay remains revoked; rotation one batch',async()=>{
  await services.ops.setPublished(actor,site.id,false);
  await services.ops.setPublished(actor,site.id,true);
  await services.links.changeShareLink(actor,site.id,'revoke');
  const events=(await pool.query("SELECT * FROM public_projection_outbox WHERE site_id=$1 AND state='pending' ORDER BY id",[site.id])).rows;
  assert.deepEqual(events.map(row=>row.payload[0].status),['unpublished','published','revoked']);
  for(let i=0;i<events.length;i++){await clearSlot();assert.equal((await projectOnce(pool,d1.send)).state,'projected');}
  const code=events.at(-1).payload[0].share_code;
  await d1.send(events[1]);await d1.send(events[2]);
  assert.equal((await d1.db.prepare('SELECT status FROM public_read_model WHERE share_code=?').bind(code).first()).status,'revoked');
  await services.links.changeShareLink(actor,site.id,'rotate');await clearSlot();await projectOnce(pool,d1.send);
  await services.links.changeShareLink(actor,site.id,'rotate');await clearSlot();const start=d1.calls.length;await projectOnce(pool,d1.send);
  assert.equal(d1.calls.length,start+1);assert.equal(d1.calls.at(-1).batch.length,2);
});

test('real PostgreSQL/Node and local D1 latency samples include500file events at production throttle',async()=>{
  // Separate D1 call history keeps report batches/events directly comparable.
  const measured=await localD1();
  try {
    const report=await measureProjection({pool,services,actor,d1:measured});
    assert.equal(report.events,12);assert.equal(report.rest_batches,12);
    console.log('PROJECTION_BENCHMARK '+JSON.stringify({...report,environment:'CI_PostgreSQL_local_D1_emulation'}));
  } finally {await measured.close();}
});
