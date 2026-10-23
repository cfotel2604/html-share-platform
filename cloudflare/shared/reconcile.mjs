import { cleanup } from './metadata.mjs';
// No HTTP endpoint. Scheduled invocation requires an explicit operator Cron configuration.
export async function reconcileExpired(env,{dryRun=true,limit=10}={}) {
  if(!Number.isInteger(limit)||limit<1||limit>50) throw new Error('Invalid reconciliation limit');
  const timestamp=new Date().toISOString();
  const candidates=await env.DB.prepare(`SELECT i.id,i.actor_id,i.site_id FROM upload_intents i
    WHERE i.cleanup_at IS NULL AND (i.state='aborted' OR (i.state='open' AND i.expires_at<=?))
    AND NOT EXISTS(SELECT 1 FROM site_versions v WHERE v.id=i.version_id)
    AND NOT EXISTS(SELECT 1 FROM preview_grants g WHERE g.version_id=i.version_id)
    ORDER BY i.expires_at LIMIT ?`).bind(timestamp,limit).all();
  const report={candidates:candidates.results.length,cleaned:0,blocked:0,failed:0};
  if(dryRun) return report;
  for(const row of candidates.results) {
    const id=crypto.randomUUID();
    try {
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO mutation_checks(id,ok) SELECT ?,CASE WHEN EXISTS(
          SELECT 1 FROM upload_intents i WHERE i.id=? AND i.cleanup_at IS NULL
          AND (i.state='aborted' OR (i.state='open' AND i.expires_at<=?))
          AND NOT EXISTS(SELECT 1 FROM site_versions v WHERE v.id=i.version_id)
          AND NOT EXISTS(SELECT 1 FROM preview_grants g WHERE g.version_id=i.version_id)) THEN 1 ELSE 0 END`).bind(id,row.id,timestamp),
        env.DB.prepare("UPDATE upload_intents SET state='aborted' WHERE id=?").bind(row.id),
        env.DB.prepare("INSERT INTO audit_events(id,actor_id,action,target_id,created_at) VALUES(?,'system:cleanup','upload.reconcile',?,?)").bind(crypto.randomUUID(),row.site_id,timestamp),
        env.DB.prepare('DELETE FROM mutation_checks WHERE id=?').bind(id),
      ]);
    } catch {report.blocked++;continue;}
    try {await cleanup(env,{id:row.actor_id},row.id);report.cleaned++;}
    catch {report.failed++;}
  }
  return report; // Counts only, never capabilities, object paths or user identifiers.
}
