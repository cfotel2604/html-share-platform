import { NextResponse } from "next/server";
import { requireActor,sameOrigin } from "@/lib/auth";
import { createPreview } from "@/lib/platform-ops";
import { apiError } from "@/lib/api-error";
import { UploadError } from "@/lib/upload-error";
export async function POST(request: Request,context: {params:Promise<{id:string}>}) {
  if(!sameOrigin(request)) return NextResponse.json({error:"Origin không hợp lệ"},{status:403});
  try {
    const actor=await requireActor(request),{id}=await context.params;
    if(!/^[a-f0-9]{32}$/.test(id)) throw new UploadError("ID không hợp lệ",400);
    return NextResponse.json(await createPreview(actor,id),{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
  } catch(error) {return apiError(error);}
}
