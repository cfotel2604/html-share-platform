import { NextResponse } from "next/server";
import { AuthError } from "./auth-policy";
import { UploadError } from "./upload-error";
export function apiError(error: unknown, fallback = "Yêu cầu chưa hoàn tất. Vui lòng thử lại.") {
  const known = error instanceof AuthError || error instanceof UploadError;
  return NextResponse.json({ error: known ? error.message : fallback },
    { status: known ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}
