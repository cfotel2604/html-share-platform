import { createClerkClient, verifyToken } from "@clerk/backend";
import { UploadError } from "./upload-error";
import { untilAborted } from "./cloudflare-deadline";
import { getCookieSuffix } from "@clerk/shared/keys";

export type SessionTokenProvider = (signal: AbortSignal) => Promise<string>;
type Scope = { userId: string; sessionId: string; origin: string; token: string; refreshToken?: string };

// Same instance suffix as Clerk's SDK, not a first-cookie/prefix search. The
// refresh endpoint independently binds this credential to the verified JWT/sid.
// Keep the value request-local; never persist, log, or forward it to the Worker.
export async function clerkRefreshCookie(header: string | null, publishableKey: string | undefined) {
  if (!header || header.length > 32768 || !publishableKey) return undefined;
  const name = '__refresh_' + await getCookieSuffix(publishableKey);
  const matches = header.split(';').map(part => part.trim()).filter(part => part.slice(0, part.indexOf('=')) === name);
  if (matches.length !== 1) return undefined;
  try {
    const value = decodeURIComponent(matches[0].slice(name.length + 1));
    return value && value.length <= 8192 && !/[\s\0]/.test(value) ? value : undefined;
  } catch { return undefined; }
}

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
      const refreshToken = scope.refreshToken;
      if (!refreshToken) throw new UploadError("Thiếu thông tin làm mới phiên. Hãy đăng nhập lại trước khi upload.", 503);
      // getToken(sid) issues a BAPI JWT without azp on the real provider. Use
      // Clerk's session refresh protocol, preserving the verified origin/session.
      // No JWT template, lifetime override, client actor ID, or service-only auth.
      const fresh = await untilAborted(() => api.sessions.refreshSession(sessionId, {
        expired_token: token, refresh_token: refreshToken, request_origin: origin, format: 'token',
      }), signal);
      const freshExpires = await untilAborted(() => validate(fresh.jwt), signal);
      if (freshExpires <= Date.now() + 20_000) throw new UploadError("Token mới không đủ thời gian sử dụng", 503);
      token = fresh.jwt;
      expires = freshExpires;
      console.info('pilot.session_refreshed');
      return token;
    } catch (error) {
      if (error instanceof UploadError) throw error;
      throw new UploadError("Chưa lấy được token hợp lệ cho phiên đăng nhập", 503);
    }
  };
}
