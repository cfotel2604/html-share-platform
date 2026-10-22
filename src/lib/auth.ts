import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { db } from "./db";
import { ownerId } from "./demo-auth";
import { authMode, clerkAvailable, dashboardHost, trustedOrigins } from "./auth-config";
import { AuthError, resolveClerkActor, type Actor } from "./auth-policy";
export { sameOrigin } from "./auth-config";
export { AuthError } from "./auth-policy";

export async function clerkSession(request?: Request) {
  if (!request) return auth({ acceptsToken: "session_token" });
  const host = request.headers.get("host") ?? "";
  const origin = trustedOrigins().find(origin => new URL(origin).host === host);
  if (!origin || !dashboardHost(host)) throw new AuthError(404,"Not found");
  const authHeaders = new Headers(request.headers);
  for (const key of [...authHeaders.keys()]) {
    if (key.startsWith("x-clerk-") || key.startsWith("x-middleware-") || key.startsWith("x-forwarded-")) authHeaders.delete(key);
  }
  // Verify headers/cookies directly: API uploads never pass through Next's buffering proxy.
  const authentication = await (await clerkClient()).authenticateRequest(new Request(origin + new URL(request.url).pathname,
    {method:request.method,headers:authHeaders}), {
      acceptsToken:"session_token", authorizedParties:trustedOrigins(), publishableKey:process.env.CLERK_PUBLISHABLE_KEY,
  });
  return authentication.toAuth();
}

export async function currentActor(request?: Request): Promise<Actor | null> {
  const host = (request ? request.headers : await headers()).get("host") ?? "";
  if (!dashboardHost(host)) {
    if (request) throw new AuthError(404,"Not found");
    return null;
  }
  if (authMode() === "local-demo") {
    const id = await ownerId();
    if (!id) return null;
    const user = await db().query<{ id: string; role: Actor["role"] }>("SELECT id,role FROM users WHERE id=$1 AND status='active'", [id]);
    return user.rows[0] ? { ...user.rows[0], mode: "local-demo" } : null;
  }
  if (!clerkAvailable()) return null;
  try {
    const identity = await clerkSession(request);
    if (!identity?.userId || !identity.sessionId) return null;
    const client = await clerkClient();
    // Online session check makes revoke effective immediately, not at JWT expiry.
    const session = await client.sessions.getSession(identity.sessionId);
    if (session.status !== "active" || session.userId !== identity.userId || session.expireAt <= Date.now()) return null;
    return await resolveClerkActor(await client.users.getUser(identity.userId));
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError(503, "Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.");
  }
}

export async function requireActor(request?: Request): Promise<Actor> {
  const actor = await currentActor(request);
  if (!actor) throw new AuthError(401, "Cần đăng nhập");
  return actor;
}
