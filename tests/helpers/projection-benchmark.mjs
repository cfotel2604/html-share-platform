import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { performance } from 'node:perf_hooks';
import { projectOnce } from '../../scripts/lib/public-projector.mjs';
import { zipBytes } from './zip.mjs';

export async function measureProjection({pool,services,actor,d1,samples=12,progress=()=>{}}) {
  const rows=[];
  for(let i=0;i<samples;i++) {
    const count=i%2===0?1:500;
    const entries=[{name:'index.html',body:'<p>synthetic benchmark</p>'},
      ...Array.from({length:count-1},(_,n)=>({name:`assets/${n}.txt`,body:`synthetic ${n}`}))];
    const created=await services.run(()=>services.ops.uploadVersion(actor,new File([zipBytes(entries)],'synthetic.zip'),'Synthetic benchmark'));
    // uploadVersion has returned only after PostgreSQL COMMIT acknowledgement.
    const commitAck=performance.now();
    for(;;) {
      const result=await projectOnce(pool,d1.send);
      if(result.state==='projected')break;
      assert.equal(result.state,'throttled');
      await sleep(Math.max(1,result.waitMs));
    }
    const lag=performance.now()-commitAck;
    const event=(await pool.query('SELECT payload FROM public_projection_outbox WHERE site_id=$1',[created.id])).rows[0];
    assert.equal(event.payload[0].manifest.length,count);
    rows.push({files:count,commit_ack_to_projected_ms:Number(lag.toFixed(3))});progress(rows.at(-1));
  }
  const percentile=(items,p)=>items.slice().sort((a,b)=>a-b)[Math.ceil(items.length*p)-1];
  const groups=[1,500].map(files=>{
    const values=rows.filter(row=>row.files===files).map(row=>row.commit_ack_to_projected_ms);
    return {files,n:values.length,p50_ms:percentile(values,0.5),p95_ms:percentile(values,0.95)};
  });
  return {environment:'local_D1_emulation',clock:'Node_performance_after_source_COMMIT_ack_to_projected_marker_ack',
    minimum_request_interval_ms:5000,rest_batches:d1.calls.length,events:rows.length,groups,samples:rows,
    pilot_verified:false,revoke_threshold_status:'proposal_only'};
}
