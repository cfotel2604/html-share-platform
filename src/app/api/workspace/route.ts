import { readStudioWorkspace } from "@/lib/studio-workspace";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return Response.json(await readStudioWorkspace(request), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
