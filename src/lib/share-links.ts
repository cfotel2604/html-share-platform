import { db } from "./db";
import { lockActor, type Actor } from "./auth-policy";
import { UploadError } from "./upload-error";
import { shareUrl } from "./public-url";
import { SHARE_CODE } from "./share-link-format";
import { allocateShareCode } from "../../scripts/share-codes.mjs";

export async function resolveViewerSite(code: string) {
  if (!SHARE_CODE.test(code)) return null;
  const result = await db().query<{ id: string; display_name: string }>(
    `SELECT s.id,s.display_name FROM site_share_links l JOIN sites s ON s.id=l.site_id
     WHERE l.code=$1 AND l.revoked_at IS NULL AND s.status='published' AND s.active_version_id IS NOT NULL`,
    [code],
  );
  return result.rows[0] ?? null;
}

export async function changeShareLink(actor: Actor, id: string, action: "rotate" | "revoke") {
  const client = await db().connect();
  let commitAttempted = false, discard = false;
  try {
    await client.query("BEGIN");
    const current = await lockActor(client, actor);
    const site = await client.query(
      "SELECT id FROM sites WHERE id=$1 AND (owner_id=$2 OR $3='admin') AND status<>'deleted' FOR UPDATE",
      [id, current.id, current.role],
    );
    if (!site.rowCount) throw new UploadError("Không tìm thấy website", 404);
    await client.query("UPDATE site_share_links SET revoked_at=now() WHERE site_id=$1 AND revoked_at IS NULL", [id]);
    const code = action === "rotate" ? await allocateShareCode(client, id) : null;
    const url = shareUrl(code); // Validate canonical URL config before committing.
    await client.query("INSERT INTO audit_events(actor_id,action,target_type,target_id) VALUES($1,$2,'site',$3)",
      [current.id, "site.share." + action, id]);
    commitAttempted = true;
    await client.query("COMMIT");
    return { id, share_code: code, share_url: url };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => { discard = true; });
    if (commitAttempted) {
      discard = true;
      throw new UploadError("Chưa xác nhận được thay đổi link. Hãy làm mới danh sách trước khi thử lại.", 503);
    }
    throw error;
  } finally { client.release(discard); }
}
