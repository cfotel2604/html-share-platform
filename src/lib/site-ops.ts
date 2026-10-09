import { randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import { ensureBucket, removeFiles, storeFile } from "./storage";
import { fingerprint, parseSite } from "./upload";
import { UploadError } from "./upload-error";
import { lockActor, type Actor } from "./auth-policy";
import { createHash } from "node:crypto";
import { shareUrl } from "./public-url";
import { allocateShareCode } from "../../scripts/share-codes.mjs";

export async function assertSiteOwner(actor: Actor, id: string) {
  const result = await db().query(
    "SELECT id FROM sites WHERE id = $1 AND (owner_id = $2 OR $3 = 'admin') AND status <> 'deleted'",
    [id, actor.id, actor.role],
  );
  if (!result.rowCount) throw new UploadError("Không tìm thấy website được phép cập nhật", 404);
}

export async function uploadVersion(actor: Actor, file: File, name: string, existingId?: string) {
  if (!name.trim() || name.length > 100) throw new UploadError("Tên website phải có 1–100 ký tự", 400);
  const id = existingId ?? randomBytes(16).toString("hex");
  const version = randomUUID();
  const prefix = `${id}/${version}`;
  const client = await db().connect();
  const attempted: string[] = [];
  let commitAttempted = false;
  let discardConnection = false;
  try {
    await client.query("BEGIN");
    const authorized = await lockActor(client, actor);
    const owner = authorized.id;
    if (existingId) {
      const current = await client.query(
        "SELECT id FROM sites WHERE id = $1 AND (owner_id = $2 OR $3 = 'admin') AND status <> 'deleted' FOR UPDATE",
        [id, owner, authorized.role],
      );
      if (!current.rowCount) throw new UploadError("Không tìm thấy website được phép cập nhật", 404);
    } else {
      await client.query(
        "INSERT INTO sites (id, owner_id, display_name, status) VALUES ($1, $2, $3, 'draft')",
        [id, owner, name.trim()],
      );
      await allocateShareCode(client, id);
    }
    // Existing-site ownership is locked before ZIP ingest and every storage side effect.
    let assets;
    try { assets = await parseSite(file); } catch (error) {
      throw new UploadError(error instanceof Error ? error.message : "File không hợp lệ", 400);
    }
    // Reserve the immutable prefix before writing; collisions cannot overwrite old versions.
    await client.query(
      `INSERT INTO site_versions
       (id, site_id, storage_prefix, uploaded_by, manifest_hash, asset_manifest, published_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())`,
      [version, id, prefix, owner, fingerprint(assets), JSON.stringify(assets.map(asset => ({
        path: asset.path, type: asset.type, size: asset.body.length,
        sha256: createHash("sha256").update(asset.body).digest("hex"),
      })))],
    );
    await ensureBucket();
    for (const asset of assets) {
      const key = `${prefix}/${asset.path}`;
      // Include the failing PUT: a lost response does not prove the object was not stored.
      attempted.push(key);
      await storeFile(key, asset.body, asset.type);
    }
    await client.query(
      `UPDATE sites SET active_version_id = $2, display_name = $3, status = 'published',
       updated_at = now() WHERE id = $1`,
      [id, version, name.trim()],
    );
    await client.query(
      `INSERT INTO audit_events (actor_id, action, target_type, target_id)
       VALUES ($1, $2, 'site', $3)`,
      [owner, existingId ? "site.update" : "site.create", id],
    );
    commitAttempted = true;
    await client.query("COMMIT");
    return { id, fileCount: assets.length };
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { discardConnection = true; }
    if (attempted.length && !commitAttempted) {
      let cleaned = false;
      for (let attempt = 0; attempt < 3 && !cleaned; attempt++) {
        try { await removeFiles(attempted); cleaned = true; } catch { /* retry idempotent deletes */ }
      }
      if (!cleaned) console.warn("upload.cleanup_failed", { version, objectCount: attempted.length });
    } else if (commitAttempted) {
      // COMMIT response loss is ambiguous. Deleting here could remove an active version.
      discardConnection = true;
      console.warn("upload.commit_outcome_unknown", { version });
      throw new UploadError("Chưa xác nhận được kết quả xuất bản. Hãy làm mới danh sách trước khi thử lại.", 503);
    }
    throw error;
  } finally {
    client.release(discardConnection);
  }
}

export async function listSites(actor: Actor) {
  return (await db().query(
    `SELECT s.id,s.display_name,s.status,s.updated_at,s.active_version_id,l.code AS share_code FROM sites s
     LEFT JOIN site_share_links l ON l.site_id=s.id AND l.revoked_at IS NULL
     WHERE (s.owner_id=$1 OR $2='admin') AND s.status<>'deleted' ORDER BY s.updated_at DESC LIMIT 200`,
    [actor.id, actor.role],
  )).rows.map(site => ({ ...site, share_url: shareUrl(site.share_code) }));
}

export async function setPublished(actor: Actor, id: string, published: boolean) {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const current = await lockActor(client, actor);
    const status = published ? "published" : "unpublished";
    const result = await client.query(
      `UPDATE sites SET status=$3,updated_at=now() WHERE id=$1 AND (owner_id=$2 OR $4='admin')
       AND active_version_id IS NOT NULL AND status IN ('published','unpublished') RETURNING id`,
      [id, current.id, status, current.role],
    );
    if (!result.rowCount) throw new UploadError("Không tìm thấy website", 404);
    await client.query(`INSERT INTO audit_events(actor_id,action,target_type,target_id) VALUES($1,$2,'site',$3)`,
      [current.id, published ? "site.publish" : "site.unpublish", id]);
    await client.query("COMMIT");
    return { id, status };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
