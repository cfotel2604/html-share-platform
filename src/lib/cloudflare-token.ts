import { createClerkClient, verifyToken } from "@clerk/backend";
import { UploadError } from "./upload-error";
import { untilAborted } from "./cloudflare-deadline";

export type SessionTokenProvider = (signal: AbortSignal) => Promise<string>;
type Scope = { userId: string; sessionId: string; origin: string; token: string };

// Called only with the identity already authenticated by Clerk on the Studio.
// The closure is request-scoped; never accept scope IDs from an upload body.
export function clerkTokenProvider(scope: Scope, { verify = verifyToken, client = createClerkClient } = {}): SessionTokenProvider {
  const { userId, sessionId, origin } = scope;
  let token = scope.token;
  let expires = 0;
  const validate = async (candidate: string) => {
    const claims = await verify(candidate, {
      secretKey: process.env.CLERK_SECRET_KEY, authorizedParties: [origin],
    });
    if (claims.sub !== userId || claims.sid !== sessionId || claims.azp !== origin ||
        typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
      throw new UploadError("Token không khớp phiên đăng nhập", 401);
    }
    return claims.exp * 1000;
  };
  return async signal => {
    try {
      signal.throwIfAborted();
      if (!expires) expires = await untilAborted(() => validate(token), signal);
      // Leave room for the bounded RPC. Never extend a JWT's lifetime.
      if (expires > Date.now() + 20_000) return token;
      const api = client({ secretKey: process.env.CLERK_SECRET_KEY });
      const session = await untilAborted(() => api.sessions.getSession(sessionId), signal);
      if (session.status !== "active" || session.userId !== userId || session.expireAt <= Date.now()) {
        throw new UploadError("Phiên đăng nhập đã hết hiệu lực", 401);
      }
      // Unlike identity.getToken() without arguments, this mints via Clerk BAPI.
      // No custom template, TTL override, or service-only authorization.
      const fresh = await untilAborted(() => api.sessions.getToken(sessionId), signal);
      const freshExpires = await untilAborted(() => validate(fresh.jwt), signal);
      if (freshExpires <= Date.now() + 20_000) throw new UploadError("Token mới không đủ thời gian sử dụng", 503);
      token = fresh.jwt;
      expires = freshExpires;
      return token;
    } catch (error) {
      if (error instanceof UploadError) throw error;
      throw new UploadError("Chưa lấy được token hợp lệ cho phiên đăng nhập", 503);
    }
  };
}
