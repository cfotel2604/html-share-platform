import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { db } from "./db";
import { ownerId } from "./demo-auth";
import { authMode, clerkAvailable, dashboardHost, trustedOrigins } from "./auth-config";
import { AuthError, resolveClerkActor, type Actor } from "./auth-policy";
import { metadataBackend } from "./metadata-backend";
import { cloudflareClient,type PilotIdentity } from "./cloudflare-rpc";
import { UploadError } from "./upload-error";
import { clerkTokenProvider, clerkRefreshCookie } from "./cloudflare-token";
import type { SiteSummary } from "@/features/studio/types";
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

// Context is resolved once per HTTP request; it is never cached across requests.
export async function currentStudioContext(request?: Request, includeSites = false): Promise<{ actor: Actor | null; sites?: SiteSummary[] }> {
  const host = (request ? request.headers : await headers()).get("host") ?? "";
  if (!dashboardHost(host)) {
    if (request) throw new AuthError(404,"Not found");
    return { actor: null };
  }
  if (authMode() === "local-demo") {
    if(metadataBackend()==='cloudflare') throw new AuthError(503,"Pilot yêu cầu Clerk, không hỗ trợ demo auth");
    const id = await ownerId();
    if (!id) return { actor: null };
    const user = await db().query<{ id: string; role: Actor["role"] }>("SELECT id,role FROM users WHERE id=$1 AND status='active'", [id]);
    return { actor: user.rows[0] ? { ...user.rows[0], mode: "local-demo" } : null };
  }
  if (!clerkAvailable()) return { actor: null };
  try {
    const identity = await clerkSession(request);
    if (!identity?.userId || !identity.sessionId) return { actor: null };
    if(metadataBackend()==='cloudflare') {
      const token=await identity.getToken();
      if(!token) return { actor: null };
      const origin=trustedOrigins().find(value=>new URL(value).host===host);
      if(!origin) throw new AuthError(404,"Not found");
      const refreshToken=await clerkRefreshCookie((request?.headers ?? await headers()).get('cookie'),process.env.CLERK_PUBLISHABLE_KEY);
      const getSessionToken=clerkTokenProvider({userId:identity.userId,sessionId:identity.sessionId,origin,token,...(refreshToken?{refreshToken}:{})});
      const rpc=cloudflareClient(getSessionToken);
      const result=includeSites ? await rpc<{actor:PilotIdentity;sites:SiteSummary[]}>('/v1/workspace') : undefined;
      const actor=result?.actor ?? (includeSites ? undefined : await rpc<PilotIdentity>('/v1/actor'));
      if(!actor || (includeSites && !Array.isArray(result?.sites))) throw new AuthError(503);
      if(typeof actor.id!=='string'||!['employee','admin'].includes(actor.role)) throw new AuthError(503);
      return {actor:{...actor,mode:'clerk',getSessionToken},...(result?{sites:result.sites}:{})};
    }
    const client = await clerkClient();
    // Online session check makes revoke effective immediately, not at JWT expiry.
    const session = await client.sessions.getSession(identity.sessionId);
    if (session.status !== "active" || session.userId !== identity.userId || session.expireAt <= Date.now()) return { actor: null };
    return {actor:await resolveClerkActor(await client.users.getUser(identity.userId))};
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if(error instanceof UploadError && [401,403,404,503].includes(error.status)) throw new AuthError(error.status as 401|403|404|503,error.message);
    throw new AuthError(503, "Chưa xác minh được phiên đăng nhập. Vui lòng thử lại.");
  }
}

export async function currentActor(request?: Request): Promise<Actor | null> {
  return (await currentStudioContext(request)).actor;
}

export async function requireActor(request?: Request): Promise<Actor> {
  const actor = await currentActor(request);
  if (!actor) throw new AuthError(401, "Cần đăng nhập");
  return actor;
}
