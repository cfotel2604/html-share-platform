import { HttpError,hash,randomHex,shareCode,manifest } from './policy.mjs';
const now=()=>new Date().toISOString();
const stmt=(db,sql,args=[])=>db.prepare(sql).bind(...args);
const policy=`EXISTS(SELECT 1 FROM users u JOIN auth_allowlist p ON p.email=u.email
 WHERE u.id=? AND u.status='active' AND p.status='active')`;
async function unusedCode(db) {
  for(let attempt=0;attempt<8;attempt++) {
    const code=shareCode();
    if(!await stmt(db,'SELECT 1 FROM site_share_links WHERE code=?',[code]).first()) return code;
  }
  throw new HttpError(503,'Code allocation unavailable');
}
export async function current(db,actor) {
  const row=await stmt(db,`SELECT u.id,p.role FROM users u JOIN auth_allowlist p ON p.email=u.email
    WHERE u.id=? AND u.status='active' AND p.status='active'`,[actor.id]).first();
  if(!row) throw new HttpError(403);return row;
}
export async function owned(db,actor,id,includeDeleted=false) {
  const row=await stmt(db,`SELECT s.* FROM sites s WHERE s.id=? AND ${includeDeleted?'1':"s.status<>'deleted'"}
    AND (s.owner_id=? OR EXISTS(SELECT 1 FROM users u JOIN auth_allowlist p ON p.email=u.email
      WHERE u.id=? AND u.status='active' AND p.status='active' AND p.role='admin'))`,[id,actor.id,actor.id]).first();
  if(!row) throw new HttpError(404);return row;
}
function siteGuard(site) {
  return {sql:`EXISTS(SELECT 1 FROM sites s JOIN users u ON u.id=? JOIN auth_allowlist p ON p.email=u.email
    WHERE s.id=? AND s.revision=? AND s.status<>'deleted' AND (s.owner_id=u.id OR p.role='admin'))`,args:[site.actor,site.id,site.revision]};
}
export async function receipt(db,actor,key) {
  return stmt(db,'SELECT * FROM mutation_receipts WHERE actor_id=? AND key=?',[actor.id,key]).first();
}
export async function mutate(env,actor,key,action,input,guard,queries,response,target) {
  const db=env.DB,bodyHash=await hash(JSON.stringify(input));
  const previous=await receipt(db,actor,key);
  const recover=row=>{
    if(row.action!==action||row.body_hash!==bodyHash) throw new HttpError(409,'Idempotency key conflict');
    return JSON.parse(row.response_json);
  };
  if(previous) return recover(previous);
  const check=crypto.randomUUID(),timestamp=now();
  const batch=[stmt(db,`INSERT INTO mutation_checks(id,ok) VALUES(?,CASE WHEN ${policy} AND (${guard.sql}) THEN 1 ELSE 0 END)`,[check,actor.id,...guard.args]),
    ...queries.map(q=>stmt(db,q.sql,q.args)),
    stmt(db,'INSERT INTO audit_events(id,actor_id,action,target_id,created_at) VALUES(?,?,?,?,?)',[crypto.randomUUID(),actor.id,action,target,timestamp]),
    stmt(db,'INSERT INTO mutation_receipts(actor_id,key,action,body_hash,response_json,created_at) VALUES(?,?,?,?,?,?)',[actor.id,key,action,bodyHash,JSON.stringify(response),timestamp]),
    stmt(db,'DELETE FROM mutation_checks WHERE id=?',[check])];
  try {await db.batch(batch);return response;}
  catch(e) {
    const committed=await receipt(db,actor,key);if(committed) return recover(committed);
    if(/constraint|CHECK|UNIQUE/i.test(String(e?.message)+' '+String(e?.cause?.message))) throw new HttpError(409,'State changed; refresh before retrying');
    throw new HttpError(503,'Mutation outcome unavailable; retry the same key');
  }
}
export async function list(env,actor) {
  const rows=await stmt(env.DB,`SELECT s.id,s.display_name,s.status,s.active_version_id,s.updated_at,l.code AS share_code
    FROM sites s LEFT JOIN site_share_links l ON l.site_id=s.id AND l.revoked_at IS NULL
    WHERE s.status<>'deleted' AND (s.owner_id=? OR ?='admin') ORDER BY s.updated_at DESC LIMIT 200`,[actor.id,actor.role]).all();
  return rows.results.map(s=>({...s,share_url:s.share_code?`${env.PUBLIC_ORIGIN}/${s.share_code}/`:null}));
}
export async function beginUpload(env,actor,key,input) {
  if(typeof input.name!=='string'||!input.name.trim()||input.name.length>100) throw new HttpError(400,'Invalid name');
  const prev=await receipt(env.DB,actor,key);
  if(prev) return mutate(env,actor,key,'upload.begin',input,{sql:'1',args:[]},[],{},'');
  const site=input.siteId ? await owned(env.DB,actor,input.siteId) : null;
  const id=site?.id??randomHex(),version=crypto.randomUUID(),intent=crypto.randomUUID();
  const result={id:intent,siteId:id,versionId:version,storagePrefix:`${id}/${version}`,expiresAt:new Date(Date.now()+30*60_000).toISOString()};
  const queries=[];
  if(!site) queries.push({sql:"INSERT INTO sites(id,owner_id,display_name,status,updated_at) VALUES(?,?,?,'draft',?)",args:[id,actor.id,input.name.trim(),now()]});
  queries.push({sql:"INSERT INTO upload_intents(id,actor_id,site_id,version_id,expected_revision,display_name,state,expires_at) VALUES(?,?,?,?,?,?,'open',?)",
    args:[intent,actor.id,id,version,site?.revision??0,input.name.trim(),result.expiresAt]});
  return mutate(env,actor,key,'upload.begin',input,site?siteGuard({...site,actor:actor.id}):{sql:'1',args:[]},queries,result,id);
}
async function uploadIntent(env,actor,id) {
  const row=await stmt(env.DB,'SELECT * FROM upload_intents WHERE id=? AND actor_id=?',[id,actor.id]).first();
  if(!row) throw new HttpError(404);return row;
}
export async function finalize(env,actor,key,intentId,input) {
  const action='upload.finalize:'+intentId;
  if(await receipt(env.DB,actor,key)) return mutate(env,actor,key,action,input,{sql:'1',args:[]},[],{},'');
  const intent=await uploadIntent(env,actor,intentId),site=await owned(env.DB,actor,intent.site_id);
  if(intent.state!=='open'||intent.expires_at<=now()) throw new HttpError(409,'Upload intent closed');
  const assets=manifest(input.assets),prefix=`${site.id}/${intent.version_id}`;
  // One strongly consistent metadata listing replaces up to 500 sequential HEADs.
  // A new immutable prefix is owned by one intent; require the complete exact
  // object set and pinned size/ETag. No byte buffering or permission cache.
  const listing=await env.ASSETS.list({prefix:prefix+'/',limit:1000});
  const objects=new Map(listing.objects.map(object=>[object.key,object]));
  if(listing.truncated||listing.objects.length!==assets.length||objects.size!==assets.length) throw new HttpError(409,'Unverified object set');
  for(const asset of assets) {
    const obj=objects.get(`${prefix}/${asset.path}`);
    if(!obj||obj.size!==asset.size||obj.etag!==asset.etag) throw new HttpError(409,'Unverified object');
  }
  const code=await stmt(env.DB,'SELECT code FROM site_share_links WHERE site_id=? AND revoked_at IS NULL',[site.id]).first();
  const hasHistory=await stmt(env.DB,'SELECT 1 FROM site_share_links WHERE site_id=? LIMIT 1',[site.id]).first();
  const allocated=code?.code??(!hasHistory?await unusedCode(env.DB):null);
  const guard=siteGuard({id:site.id,revision:intent.expected_revision,actor:actor.id});
  guard.sql+=` AND EXISTS(SELECT 1 FROM upload_intents WHERE id=? AND actor_id=? AND state='open' AND expires_at>?)`;
  guard.args.push(intentId,actor.id,now());
  const queries=[
    {sql:'INSERT INTO site_versions(id,site_id,storage_prefix,created_at) VALUES(?,?,?,?)',args:[intent.version_id,site.id,prefix,now()]},
    {sql:`INSERT INTO version_assets(version_id,path,type,size,sha256,etag)
      SELECT ?,json_extract(value,'$.path'),json_extract(value,'$.type'),json_extract(value,'$.size'),json_extract(value,'$.sha256'),json_extract(value,'$.etag') FROM json_each(?)`,args:[intent.version_id,JSON.stringify(assets)]},
    {sql:"UPDATE sites SET active_version_id=?,status='published',display_name=?,revision=revision+1,updated_at=? WHERE id=?",args:[intent.version_id,intent.display_name,now(),site.id]},
    {sql:"UPDATE upload_intents SET state='finalized' WHERE id=?",args:[intentId]},
  ];
  if(allocated&&!code) queries.push({sql:'INSERT INTO site_share_links(code,site_id) VALUES(?,?)',args:[allocated,site.id]});
  const response={id:site.id,fileCount:assets.length};
  // UNIQUE races roll back safely; retrying the same operation key can allocate another code.
  return mutate(env,actor,key,action,input,guard,queries,response,site.id);
}
export async function status(env,actor,key,id,input) {
  const action='site.status:'+id;
  if(await receipt(env.DB,actor,key)) return mutate(env,actor,key,action,input,{sql:'1',args:[]},[],{},id);
  const site=await owned(env.DB,actor,id);
  if(typeof input.published!=='boolean'&&input.deleted!==true) throw new HttpError(400);
  const state=input.deleted===true?'deleted':input.published?'published':'unpublished';
  const guard=siteGuard({...site,actor:actor.id});
  if(state==='published') {
    guard.sql+=' AND EXISTS(SELECT 1 FROM sites WHERE id=? AND active_version_id IS NOT NULL)';guard.args.push(id);
  }
  return mutate(env,actor,key,action,input,guard,[{sql:'UPDATE sites SET status=?,revision=revision+1,updated_at=? WHERE id=?',args:[state,now(),id]}],{id,status:state},id);
}
export async function share(env,actor,key,id,revoke) {
  const action='site.share.'+(revoke?'revoke:':'rotate:')+id,input={revoke};
  if(await receipt(env.DB,actor,key)) return mutate(env,actor,key,action,input,{sql:'1',args:[]},[],{},id);
  const site=await owned(env.DB,actor,id),code=revoke?null:await unusedCode(env.DB),timestamp=now();
  const queries=[{sql:'UPDATE site_share_links SET revoked_at=? WHERE site_id=? AND revoked_at IS NULL',args:[timestamp,id]},
    {sql:'UPDATE sites SET revision=revision+1,updated_at=? WHERE id=?',args:[timestamp,id]}];
  if(code) queries.push({sql:'INSERT INTO site_share_links(code,site_id) VALUES(?,?)',args:[code,id]});
  return mutate(env,actor,key,action,input,siteGuard({...site,actor:actor.id}),queries,
    {id,share_code:code,share_url:code?`${env.PUBLIC_ORIGIN}/${code}/`:null},id);
}
export async function preview(env,actor,key,id,token) {
  const action='site.preview:'+id,input={};
  if(await receipt(env.DB,actor,key)) return mutate(env,actor,key,action,input,{sql:'1',args:[]},[],{},id);
  const site=await owned(env.DB,actor,id);if(!site.active_version_id) throw new HttpError(404);
  const expiresAt=new Date(Date.now()+180_000).toISOString();
  return mutate(env,actor,key,action,input,siteGuard({...site,actor:actor.id}),[
    {sql:'INSERT INTO preview_grants(token_hash,actor_id,site_id,version_id,expires_at) VALUES(?,?,?,?,?)',args:[await hash(token),actor.id,id,site.active_version_id,expiresAt]},
  ],{expiresAt,displayName:site.display_name},id); // Raw capability never persisted in receipt.
}
export async function abort(env,actor,key,id) {
  const input={},action='upload.abort:'+id;
  if(await receipt(env.DB,actor,key)) return mutate(env,actor,key,action,input,{sql:'1',args:[]},[],{},id);
  const intent=await uploadIntent(env,actor,id);
  return mutate(env,actor,key,action,input,{sql:"EXISTS(SELECT 1 FROM upload_intents WHERE id=? AND actor_id=? AND state IN ('open','aborted'))",args:[id,actor.id]},[
    {sql:"UPDATE upload_intents SET state='aborted',cleanup_after=? WHERE id=?",args:[now(),id]},
  ],{id,state:'aborted',storagePrefix:`${intent.site_id}/${intent.version_id}`},intent.site_id);
}
export async function cleanup(env,actor,id) {
  const intent=await uploadIntent(env,actor,id);
  // Aborted is terminal; finalize's guard prevents a concurrent resurrection.
  const safe=await stmt(env.DB,`SELECT 1 FROM upload_intents i WHERE i.id=? AND i.state='aborted'
    AND NOT EXISTS(SELECT 1 FROM site_versions v WHERE v.id=i.version_id)
    AND NOT EXISTS(SELECT 1 FROM preview_grants g WHERE g.version_id=i.version_id)`,[id]).first();
  if(!safe) throw new HttpError(409,'Cleanup not authorized');
  const prefix=`${intent.site_id}/${intent.version_id}/`;let cursor,count=0;
  do {
    const page=await env.ASSETS.list({prefix,cursor,limit:500});
    if(page.objects.some(o=>!o.key.startsWith(prefix))) throw new HttpError(503);
    if(page.objects.length) await env.ASSETS.delete(page.objects.map(o=>o.key));
    count+=page.objects.length;cursor=page.truncated?page.cursor:undefined;
  } while(cursor);
  // A cancelled Node request is not a provider-side write fence. Retain this
  // tombstone and resweep after 5 minutes, daily once its expiry is >24h old.
  // No terminal scan count or age cutoff can strand a late in-flight PUT.
  const timestamp=now(),settled=Date.now()-Date.parse(intent.expires_at)>24*60*60_000;
  const after=new Date(Date.now()+(settled?24*60*60_000:5*60_000)).toISOString();
  await stmt(env.DB,"UPDATE upload_intents SET cleanup_at=?,cleanup_after=? WHERE id=? AND state='aborted'",[timestamp,after,id]).run();
  return {removed:count};
}
