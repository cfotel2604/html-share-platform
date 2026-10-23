import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
import { authMode } from "./auth-config";
import { metadataBackend } from "./metadata-backend";

const COOKIE_NAME = "ods_local_demo_session";
const SEVEN_DAYS = 7 * 24 * 60 * 60;

export function demoEnabled() {
  return metadataBackend()==='postgres' && authMode() === "local-demo" && process.env.LOCAL_DEMO_MODE === "1" &&
    Boolean(process.env.LOCAL_DEMO_PASSWORD && process.env.LOCAL_DEMO_SESSION_SECRET);
}

function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function sign(expiry: string) {
  return createHmac("sha256", process.env.LOCAL_DEMO_SESSION_SECRET ?? "")
    .update(`local-demo:${expiry}`)
    .digest("hex");
}

export function checkPassword(password: string) {
  return demoEnabled() && equal(password, process.env.LOCAL_DEMO_PASSWORD ?? "");
}

export async function createSession() {
  const expiry = String(Math.floor(Date.now() / 1000) + SEVEN_DAYS);
  const token = `${expiry}.${sign(expiry)}`;
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false, // Local HTTP ONLY. Replace with Clerk production auth for internet access.
    path: "/",
    maxAge: SEVEN_DAYS,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function ownerId(): Promise<string | null> {
  if (!demoEnabled()) return null;
  const token = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  const [expiry, sig, extra] = token.split(".");
  if (extra || !expiry || !sig || !/^\d{10}$/.test(expiry)) return null;
  if (Number(expiry) < Date.now() / 1000 || !equal(sig, sign(expiry))) return null;
  const result = await db().query<{ id: string }>(
    `INSERT INTO users (external_identity, role, status)
     VALUES ('local-demo:owner', 'admin', 'active')
     ON CONFLICT (external_identity) DO UPDATE SET external_identity=EXCLUDED.external_identity
       WHERE users.status='active'
     RETURNING id`,
  );
  return result.rows[0]?.id ?? null;
}
