import { NextResponse } from "next/server";
import { ownerId, sameOrigin } from "@/lib/demo-auth";
import { db } from "@/lib/db";
import { uploadVersion } from "@/lib/site-ops";
import { readUpload } from "@/lib/upload-request";
import { UploadError } from "@/lib/upload-error";

export const runtime = "nodejs";

export async function GET() {
  const owner = await ownerId();
  if (!owner) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  const sites = await db().query(
    `SELECT id, display_name, status, updated_at, active_version_id
     FROM sites WHERE owner_id = $1 AND status <> 'deleted'
     ORDER BY updated_at DESC LIMIT 200`,
    [owner],
  );
  return NextResponse.json({ sites: sites.rows }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  const owner = await ownerId();
  if (!owner) return NextResponse.json({ error: "Cần đăng nhập" }, { status: 401 });
  try {
    const { upload, name } = await readUpload(request);
    const site = await uploadVersion(owner, upload, name);
    return NextResponse.json(site, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof UploadError ? error.message : "Upload thất bại. Vui lòng thử lại." },
      { status: error instanceof UploadError ? error.status : 500 },
    );
  }
}
