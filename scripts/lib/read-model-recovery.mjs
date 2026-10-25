import { createHash,randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { validateEvent,ProjectionError,bindProjectorTarget,projectOnce,MIN_INTERVAL_MS } from './public-projector.mjs';

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const codeRef=code=>digest(code).slice(0,16);
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const stable=value=>JSON.stringify(canonical(value));
const watermark=async pool=>(await pool.query('SELECT coalesce(max(id),0)::text AS n FROM public_projection_outbox')).rows[0].n;

// Public columns only, including all historical revoked codes. Never select users,
// display names, receipts, audit, hash bytes or arbitrary asset JSON into Node.
const sourceSql=`SELECT jsonb_build_object('share_code',l.code,'site_id',s.id,
  'status',CASE WHEN l.revoked_at IS NOT NULL OR s.status='deleted' THEN 'revoked'
    WHEN s.status='published' THEN 'published' ELSE 'unpublished' END,
  'active_version',CASE WHEN l.revoked_at IS NULL AND s.status='published' THEN s.active_version_id::text ELSE NULL END,
  'manifest',CASE WHEN l.revoked_at IS NULL AND s.status='published' THEN
    (SELECT jsonb_agg(jsonb_build_object('path',a->>'path','r2_key',v.storage_prefix||'/'||(a->>'path'),
      'size',(a->>'size')::bigint,'etag',a->>'etag') ORDER BY a->>'path') FROM jsonb_array_elements(v.asset_manifest) a)
    ELSE '[]'::jsonb END,'projection_version',coalesce(e.id,0),
  'updated_at',coalesce((SELECT item->>'updated_at' FROM jsonb_array_elements(e.payload) item WHERE item->>'share_code'=l.code),
    to_char(s.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))) AS snapshot
  FROM site_share_links l JOIN sites s ON s.id=l.site_id
  LEFT JOIN site_versions v ON v.site_id=s.id AND v.id=s.active_version_id
  LEFT JOIN LATERAL(SELECT id,payload FROM public_projection_outbox o WHERE o.site_id=s.id AND l.code=ANY(o.changed_codes)
    ORDER BY id DESC LIMIT 1)e ON true
  WHERE l.code>$1 COLLATE "C" AND ($2::text[] IS NULL OR l.code=ANY($2)) ORDER BY l.code COLLATE "C" LIMIT 20`;

export async function sourceSnapshots(pool,codes=null) {
  const client=await pool.connect(),rows=[];let cursor='',bytes=0;
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    for(;;) {
      const page=(await client.query(sourceSql,[cursor,codes])).rows;
      for(const {snapshot} of page){bytes+=Buffer.byteLength(JSON.stringify(snapshot));rows.push(snapshot);}
      if(bytes>16*1024*1024 || rows.length>10000)throw new ProjectionError('recovery_plan_too_large');
      if(page.length<20)break;cursor=page.at(-1).snapshot.share_code;
    }
    const revision=await watermark(client);await client.query('COMMIT');return {rows,revision};
  } catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;} finally{client.release();}
}

// D1 reads share the projector's durable slot and lock, including on dry-run.
// Dry-run changes only throttle metadata, never source/outbox/audit/D1 rows.
export async function recoveryReadPage(pool,send,cursor='') {
  const client=await pool.connect();let locked=false,discard=false;
  try {
    locked=(await client.query('SELECT pg_try_advisory_lock($1) AS locked',[330006])).rows[0].locked;
    if(!locked)return {waitMs:1000};
    const {rows:[control]}=await client.query('SELECT next_request_at,clock_timestamp() AS now,target_fingerprint FROM public_projection_control WHERE id=1');
    if(control.target_fingerprint && control.target_fingerprint!==send.targetFingerprint)throw new ProjectionError('target_mismatch');
    const waitMs=new Date(control.next_request_at).getTime()-new Date(control.now).getTime();
    if(waitMs>0)return {waitMs};
    await client.query("UPDATE public_projection_control SET next_request_at=clock_timestamp()+$1*interval '1 millisecond' WHERE id=1",[MIN_INTERVAL_MS]);
    try{return {rows:await send.readPage(cursor)};}
    catch(error){
      if(error instanceof ProjectionError && ['rate_limited','http_401','http_403'].includes(error.code)){
        await client.query("UPDATE public_projection_control SET next_request_at=greatest(next_request_at,clock_timestamp()+$1*interval '1 millisecond') WHERE id=1",
          [Math.max(300000,Number.isFinite(error.retryAfterMs)?error.retryAfterMs:0)]);
      }
      throw error;
    }
  } finally {
    if(locked){try{await client.query('SELECT pg_advisory_unlock($1)',[330006]);}catch{discard=true;}}
    client.release(discard);
  }
}

async function targetSnapshots(pool,send) {
  const rows=[];let cursor='',bytes=0;
  for(;;){
    const page=await recoveryReadPage(pool,send,cursor);
    if(!page.rows){await sleep(Math.min(page.waitMs,1000));continue;}
    for(const raw of page.rows){
      let row;
      try{row={...raw,manifest:JSON.parse(raw.manifest)};validateEvent({id:row.projection_version,site_id:row.site_id,payload:[row]});}
      catch{throw new ProjectionError('invalid_target_snapshot');}
      if(row.share_code<=cursor)throw new ProjectionError('invalid_response');cursor=row.share_code;
      bytes+=Buffer.byteLength(JSON.stringify(row));rows.push(row);
    }
    if(bytes>16*1024*1024 || rows.length>10000)throw new ProjectionError('recovery_plan_too_large');
    if(page.rows.length<20)return rows;
  }
}

export async function planRecovery(pool,send,{mode='reconcile'}={}) {
  if(!['rebuild','reconcile'].includes(mode))throw new ProjectionError('invalid_config');
  const source=await sourceSnapshots(pool),target=await targetSnapshots(pool,send);
  // Sequence allocation is not global commit order across sites: compare the
  // complete bounded source snapshot, not only MAX(id), after remote reads.
  const checked=await sourceSnapshots(pool);
  if(stable(checked)!==stable(source))throw new ProjectionError('source_changed');
  const expected=new Map(source.rows.map(row=>[row.share_code,row])),actual=new Map(target.map(row=>[row.share_code,row]));
  const differences=[],selected=[];
  for(const row of source.rows){
    const found=actual.get(row.share_code);let reason;
    try{validateEvent({id:row.projection_version||1,site_id:row.site_id,payload:[{...row,projection_version:row.projection_version||1}]});}
    catch{reason='invalid_source_manifest';}
    if(found?.site_id!==undefined && found.site_id!==row.site_id)reason='identity_conflict';
    if(found?.status==='revoked' && row.status!=='revoked')reason='tombstone_conflict';
    if(found && BigInt(found.projection_version)>BigInt(source.revision))reason='target_ahead';
    const fields=found?['status','active_version','manifest','projection_version'].filter(key=>stable(row[key])!==stable(found[key])):['missing'];
    if(!row.projection_version && !fields.includes('projection_version'))fields.push('projection_version');
    if(reason || fields.length || mode==='rebuild'){
      differences.push({code_ref:codeRef(row.share_code),fields,action:reason?'blocked':'reproject',...(reason?{reason}:{})});
      if(!reason)selected.push(row);
    }
  }
  for(const row of target)if(!expected.has(row.share_code))differences.push({code_ref:codeRef(row.share_code),fields:['extra'],action:'blocked',reason:'unknown_code'});
  const fingerprint=digest([mode,send.targetFingerprint,source.revision,canonical(source.rows),canonical(target)]);
  return {mode,fingerprint,source_revision:source.revision,source_count:source.rows.length,target_count:target.length,
    differences,blocked:differences.some(row=>row.action==='blocked'),selected};
}
export function publicRecoveryPlan(plan){const {selected:_,...report}=plan;void _;return report;}

export async function enqueueRecovery(pool,plan,operatorId) {
  if(plan.blocked)throw new ProjectionError('recovery_blocked');
  if(!/^[a-f0-9-]{36}$/i.test(operatorId??''))throw new ProjectionError('invalid_operator');
  if(!(await pool.query(`SELECT u.id FROM users u JOIN auth_allowlist p ON p.email=u.email WHERE u.id=$1
    AND u.status='active' AND u.role='admin' AND p.status='active' AND p.role='admin'`,[operatorId])).rowCount)throw new ProjectionError('invalid_operator');
  const current=await sourceSnapshots(pool,plan.selected.map(row=>row.share_code));
  if(stable(current.rows)!==stable(plan.selected))throw new ProjectionError('source_changed');
  const runId=randomUUID(),ids=[];
  const groups=new Map();for(const row of plan.selected){if(!groups.has(row.site_id))groups.set(row.site_id,[]);groups.get(row.site_id).push(row);}
  for(const [siteId,rows] of [...groups].sort(([a],[b])=>a.localeCompare(b))){
    for(let start=0;start<rows.length;start+=100){
      const chunk=rows.slice(start,start+100),client=await pool.connect();
      try {
        await client.query('BEGIN');
        const actor=await client.query(`SELECT u.id FROM users u JOIN auth_allowlist p ON p.email=u.email
          WHERE u.id=$1 AND u.status='active' AND u.role='admin' AND p.status='active' AND p.role='admin' FOR SHARE OF u,p`,[operatorId]);
        if(!actor.rowCount)throw new ProjectionError('invalid_operator');
        await client.query('SELECT id FROM sites WHERE id=$1 FOR UPDATE',[siteId]);
        const current=[];let cursor='';
        for(;;){const page=(await client.query(sourceSql,[cursor,chunk.map(row=>row.share_code)])).rows;
          current.push(...page.map(row=>row.snapshot));if(page.length<20)break;cursor=page.at(-1).snapshot.share_code;}
        if(stable(current)!==stable(chunk))throw new ProjectionError('source_changed');
        const {rows:[event]}=await client.query(`INSERT INTO public_projection_outbox(site_id,changed_codes,priority)
          VALUES($1,$2,$3) RETURNING id`,[siteId,chunk.map(row=>row.share_code),chunk.some(row=>row.status!=='published')]);
        await client.query(`INSERT INTO audit_events(actor_id,action,target_type,target_id,request_id)
          VALUES($1,$2,'public-recovery',$3,$4)`,[operatorId,'public.'+plan.mode,plan.fingerprint+':'+event.id,runId]);
        await client.query('COMMIT');ids.push(event.id);
      }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
    }
  }
  return {run_id:runId,event_ids:ids};
}

export async function applyRecovery(pool,send,plan,{fingerprint,operatorId,log=()=>{}}={}) {
  if(plan.fingerprint!==fingerprint)throw new ProjectionError('plan_changed');
  if(plan.blocked)throw new ProjectionError('recovery_blocked');
  await bindProjectorTarget(pool,send.targetFingerprint);
  const queued=await enqueueRecovery(pool,plan,operatorId);
  for(;;){
    const count=(await pool.query("SELECT count(*)::int n FROM public_projection_outbox WHERE id=ANY($1::bigint[]) AND state='pending'",[queued.event_ids])).rows[0].n;
    if(!count)return {run_id:queued.run_id,events:queued.event_ids.length,state:'projected'};
    const result=await projectOnce(pool,send,{log});
    if(result.state==='retry' || result.state==='idle')return {run_id:queued.run_id,events:queued.event_ids.length,state:'pending'};
    if(result.state==='throttled' || result.state==='contended')await sleep(Math.min(result.waitMs??1000,1000));
  }
}
