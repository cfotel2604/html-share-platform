import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";
import { readStudioWorkspace, workspaceAuth } from "@/lib/studio-workspace";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await readStudioWorkspace(request), {headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    if(error instanceof AuthError && error.status===403) {
      return NextResponse.json({auth:{...workspaceAuth(),denied:true},sites:[]},{headers:{"Cache-Control":"no-store"}});
    }
    return apiError(error);
  }
}
