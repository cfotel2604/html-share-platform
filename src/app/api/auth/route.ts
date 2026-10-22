import { NextResponse } from "next/server";
import { checkPassword, clearSession, createSession, demoEnabled, ownerId, sameOrigin } from "@/lib/demo-auth";

export const runtime = "nodejs";

let attempts = 0;
let lockedUntil = 0;

export async function GET() {
  return NextResponse.json(
    { signedIn: Boolean(await ownerId()), demoAvailable: demoEnabled() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin không hợp lệ" }, { status: 403 });
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
  await clearSession();
  return NextResponse.json({ signedIn: false });
}
