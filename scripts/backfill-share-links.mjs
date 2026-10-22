import pg from "pg";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { allocateShareCode } from "./share-codes.mjs";

export async function backfillShareLinks(pool) {
  const sites = await pool.query(
    "SELECT id FROM sites WHERE status<>'deleted' AND NOT EXISTS(SELECT 1 FROM site_share_links l WHERE l.site_id=sites.id) ORDER BY id",
  );
  let created = 0;
  for (const { id } of sites.rows) {
    const client = await pool.connect();
    let discard = false;
    try {
      await client.query("BEGIN");
      const site = await client.query("SELECT id FROM sites WHERE id=$1 AND status<>'deleted' FOR UPDATE", [id]);
      // Separate fresh statement after the lock: concurrent operators cannot recreate a revoked link.
      const history = await client.query("SELECT 1 FROM site_share_links WHERE site_id=$1 LIMIT 1", [id]);
      if (site.rowCount && !history.rowCount) {
        await allocateShareCode(client, id);
        await client.query("INSERT INTO audit_events(action,target_type,target_id) VALUES('site.share.backfill','site',$1)", [id]);
        await client.query("COMMIT");
        created++;
      } else await client.query("ROLLBACK");
    } catch (error) {
      discard = true;
      await client.query("ROLLBACK").catch(() => {});
      // Rerunning is safe after a lost COMMIT response; any history prevents reissue.
      throw error;
    } finally { client.release(discard); }
  }
  return created;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const pool = new pg.Pool({ connectionTimeoutMillis: 5000 });
  try { console.log(JSON.stringify({ created: await backfillShareLinks(pool) })); }
  catch { console.error("Share link backfill failed; check database availability and migration 0003."); process.exitCode = 1; }
  finally { await pool.end(); }
}
