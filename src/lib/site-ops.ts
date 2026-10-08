import { randomBytes, randomUUID } from "node:crypto";
import { db } from "./db";
import { ensureBucket, storeFile } from "./storage";
import { fingerprint, parseSite } from "./upload";

export async function uploadVersion(owner: string, file: File, name: string, existingId?: string) {
  if (!name.trim() || name.length > 100) throw new Error("Tên website phải có 1–100 ký tự");
  const assets = await parseSite(file);
  const id = existingId ?? randomBytes(16).toString("hex");
  const version = randomUUID();
  const prefix = `${id}/${version}`;
  await ensureBucket();
  for (const asset of assets) {
    await storeFile(`${prefix}/${asset.path}`, asset.body, asset.type);
  }
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    if (existingId) {
      const current = await client.query(
        "SELECT id FROM sites WHERE id = $1 AND owner_id = $2 AND status <> 'deleted' FOR UPDATE",
        [id, owner],
      );
      if (!current.rowCount) throw new Error("Không tìm thấy website được phép cập nhật");
    } else {
      await client.query(
        "INSERT INTO sites (id, owner_id, display_name, status) VALUES ($1, $2, $3, 'draft')",
        [id, owner, name.trim()],
      );
    }
    await client.query(
      `INSERT INTO site_versions
       (id, site_id, storage_prefix, uploaded_by, manifest_hash, published_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [version, id, prefix, owner, fingerprint(assets)],
    );
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
    await client.query("COMMIT");
    return { id, fileCount: assets.length };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function readUpload(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 22 * 1024 * 1024) throw new Error("Upload vượt giới hạn 20 MiB");
  const form = await request.formData();
  const upload = form.get("file");
  const name = form.get("name");
  if (!(upload instanceof File) || typeof name !== "string") {
    throw new Error("Thiếu tên hoặc file HTML/ZIP");
  }
  return { upload, name };
}
