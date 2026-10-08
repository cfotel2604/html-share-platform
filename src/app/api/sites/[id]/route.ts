import { NextResponse } from "next/server";
import { ownerId, sameOrigin } from "@/lib/demo-auth";
import { db } from "@/lib/db";
import { readUpload, uploadVersion } from "@/lib/site-ops";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const ID = /^[a-f0-9]{32}$/;

export async function PUT(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  const owner = await ownerId();
  if (!owner) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await context.params;
  if (!ID.test(id)) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  try {
    const { upload, name } = await readUpload(request);
    return NextResponse.json(await uploadVersion(owner, upload, name, id));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update thất bại" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  const owner = await ownerId();
  if (!owner) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const { id } = await context.params;
  if (!ID.test(id)) return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
  let published: unknown;
  try { published = (await request.json()).published; } catch { /* invalid JSON */ }
  if (typeof published !== "boolean") {
    return NextResponse.json({ error: "Thiếu trạng thái published" }, { status: 400 });
  }
  const status = published ? "published" : "unpublished";
  const result = await db().query(
    `UPDATE sites SET status = $3, updated_at = now()
     WHERE id = $1 AND owner_id = $2 AND active_version_id IS NOT NULL
       AND status IN ('published', 'unpublished')
     RETURNING id`,
    [id, owner, status],
  );
  if (!result.rowCount) return NextResponse.json({ error: "Không tìm thấy website" }, { status: 404 });
  await db().query(
    `INSERT INTO audit_events (actor_id, action, target_type, target_id)
     VALUES ($1, $2, 'site', $3)`,
    [owner, status === "published" ? "site.publish" : "site.unpublish", id],
  );
  return NextResponse.json({ id, status });
}
