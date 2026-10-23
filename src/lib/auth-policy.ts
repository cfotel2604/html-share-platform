import type { PoolClient } from "pg";
import { db } from "./db";

export type Actor = { id: string; role: "employee" | "admin"; mode: "clerk" | "local-demo"; sessionToken?: string };
export class AuthError extends Error {
  constructor(public readonly status: 401 | 403 | 404 | 503, message = "Không có quyền truy cập") { super(message); }
}

type ClerkUser = {
  id: string; primaryEmailAddressId: string | null; banned: boolean; locked: boolean;
  emailAddresses: { id: string; emailAddress: string; verification: { status: string } | null }[];
  externalAccounts: { provider: string; emailAddress: string }[];
};

export function verifiedGoogleEmail(user: ClerkUser): string | null {
  if (user.banned || user.locked) return null;
  const address = user.emailAddresses.find(email => email.id === user.primaryEmailAddressId);
  if (!address || address.verification?.status !== "verified") return null;
  const email = address.emailAddress.trim().toLowerCase();
  if (!user.externalAccounts.some(account => account.provider === "oauth_google" && account.emailAddress.toLowerCase() === email)) return null;
  return email.length <= 254 ? email : null;
}

export async function resolveClerkActor(user: ClerkUser): Promise<Actor> {
  const email = verifiedGoogleEmail(user);
  if (!email) throw new AuthError(403, "Cần email Google đã xác minh và được cấp quyền");
  const result = await db().query<{ id: string; role: Actor["role"] }>(
    `INSERT INTO users (external_identity,email,role,status)
     SELECT $1,a.email,a.role,'active' FROM auth_allowlist a WHERE a.email=$2 AND a.status='active'
     ON CONFLICT (external_identity) DO UPDATE SET email=EXCLUDED.email,role=EXCLUDED.role
       WHERE users.status='active'
     RETURNING id,role`, ["clerk:" + user.id, email],
  );
  if (!result.rowCount) throw new AuthError(403, "Tài khoản chưa được cấp quyền hoặc đã bị khóa");
  return { ...result.rows[0], mode: "clerk" };
}

// Lock policy rows during mutations. Revocation cannot race storage/publish side effects.
export async function lockActor(client: Pick<PoolClient, "query">, actor: Actor): Promise<Actor> {
  const sql = actor.mode === "clerk"
    ? `SELECT u.id,a.role FROM users u JOIN auth_allowlist a ON a.email=u.email
       WHERE u.id=$1 AND u.status='active' AND a.status='active' AND u.external_identity LIKE 'clerk:%'
       FOR SHARE OF u,a`
    : `SELECT id,role FROM users WHERE id=$1 AND status='active' AND external_identity='local-demo:owner' FOR SHARE`;
  const result = await client.query<{ id: string; role: Actor["role"] }>(sql, [actor.id]);
  if (!result.rowCount) throw new AuthError(403, "Quyền truy cập đã bị thu hồi");
  return { ...result.rows[0], mode: actor.mode };
}
