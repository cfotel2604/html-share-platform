import { NextResponse } from "next/server";
import { checkPassword, clearSession, createSession, demoEnabled } from "@/lib/demo-auth";
import { currentActor, sameOrigin,clerkSession,AuthError } from "@/lib/auth";
import { authMode, clerkAvailable, dashboardHost } from "@/lib/auth-config";
import { apiError } from "@/lib/api-error";
import { clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

let attempts = 0;
let lockedUntil = 0;

export async function GET(request: Request) {
  try {
    const actor = await currentActor(request);
    return NextResponse.json({ signedIn: Boolean(actor), demoAvailable: demoEnabled(),
      provider: authMode(), available: clerkAvailable() || demoEnabled(), role: actor?.role ?? null },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if(error instanceof AuthError && error.status===403) return NextResponse.json({signedIn:false,demoAvailable:false,provider:authMode(),available:clerkAvailable(),denied:true}, {headers:{"Cache-Control":"no-store"}});
    return apiError(error);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  if (!dashboardHost(request.headers.get("host") ?? "")) return NextResponse.json({error:"Not found"},{status:404});
  if (!demoEnabled()) return NextResponse.json({ error: "Chế độ demo chưa bật" }, { status: 503 });
  if (Date.now() < lockedUntil) return NextResponse.json({ error: "Thử lại sau" }, { status: 429 });
  let password = "";
  try {
    const input = await request.json();
    if (typeof input.password === "string" && input.password.length < 512) password = input.password;
  } catch { /* invalid JSON */ }
  if (!checkPassword(password)) {
    attempts++;
    if (attempts >= 8) { attempts = 0; lockedUntil = Date.now() + 60_000; }
    return NextResponse.json({ error: "Mật khẩu demo không đúng" }, { status: 401 });
  }
  attempts = 0;
  await createSession();
  return NextResponse.json({ signedIn: true });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
  try {
    if(!dashboardHost(request.headers.get("host")??"")) throw new AuthError(404,"Not found");
    if (authMode() === "clerk") {
      const sessionId = (await clerkSession(request))?.sessionId;
      if (sessionId) await (await clerkClient()).sessions.revokeSession(sessionId);
    } else await clearSession();
    return NextResponse.json({ signedIn: false });
  } catch(error) { return apiError(error,"Đăng xuất chưa hoàn tất"); }
}
