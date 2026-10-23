import { NextResponse } from "next/server";
import { requireActor, sameOrigin } from "@/lib/auth";
import { listSites, uploadVersion } from "@/lib/platform-ops";
import { readUpload } from "@/lib/upload-request";
import { apiError } from "@/lib/api-error";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { return NextResponse.json({ sites: await listSites(await requireActor(request)) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  try {
    const actor = await requireActor(request);
    const { upload, name } = await readUpload(request);
    return NextResponse.json(await uploadVersion(actor, upload, name), { status: 201 });
  } catch (error) { return apiError(error, "Upload thất bại. Vui lòng thử lại."); }
}
