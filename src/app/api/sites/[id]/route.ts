import { NextResponse } from "next/server";
import { requireActor, sameOrigin } from "@/lib/auth";
import { assertSiteOwner, setPublished, uploadVersion } from "@/lib/platform-ops";
import { readUpload } from "@/lib/upload-request";
import { apiError } from "@/lib/api-error";
import { UploadError } from "@/lib/upload-error";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const ID = /^[a-f0-9]{32}$/;
export async function PUT(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  try {
    const actor = await requireActor(request), { id } = await context.params;
    if (!ID.test(id)) throw new UploadError("ID không hợp lệ", 400);
    await assertSiteOwner(actor, id);
    const { upload, name } = await readUpload(request);
    return NextResponse.json(await uploadVersion(actor, upload, name, id));
  } catch (error) { return apiError(error, "Update thất bại. Vui lòng thử lại."); }
}
export async function PATCH(request: Request, context: Context) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  try {
    const actor = await requireActor(request), { id } = await context.params;
    if (!ID.test(id)) throw new UploadError("ID không hợp lệ", 400);
    await assertSiteOwner(actor, id);
    let published: unknown;
    try { published = (await request.json()).published; } catch { /* invalid JSON */ }
    if (typeof published !== "boolean") throw new UploadError("Thiếu trạng thái published", 400);
    return NextResponse.json(await setPublished(actor, id, published));
  } catch (error) { return apiError(error); }
}
