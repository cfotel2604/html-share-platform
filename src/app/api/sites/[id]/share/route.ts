import { NextResponse } from "next/server";
import { requireActor, sameOrigin } from "@/lib/auth";
import { changeShareLink } from "@/lib/platform-ops";
import { apiError } from "@/lib/api-error";
import { UploadError } from "@/lib/upload-error";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

async function change(request: Request, context: Context, action: "rotate" | "revoke") {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  try {
    const actor = await requireActor(request), { id } = await context.params;
    if (process.env.SHARE_LINK_MUTATIONS_ENABLED === "false") throw new UploadError("Thao tác link đang tạm khóa. Vui lòng thử lại sau.", 503);
    if (!/^[a-f0-9]{32}$/.test(id)) throw new UploadError("ID không hợp lệ", 400);
    return NextResponse.json(await changeShareLink(actor, id, action), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, "Chưa thay đổi được link. Vui lòng thử lại."); }
}
export const POST = (request: Request, context: Context) => change(request, context, "rotate");
export const DELETE = (request: Request, context: Context) => change(request, context, "revoke");
