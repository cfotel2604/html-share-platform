import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { authMode, clerkAvailable, loopbackHost, trustedOrigins } from "@/lib/auth-config";
import { viewerLimit } from "@/lib/viewer-limit";

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const host = request.headers.get("host") ?? "", path = request.nextUrl.pathname;
  const viewer = process.env.VIEWER_PUBLIC_ORIGIN;
  const viewerHost = viewer ? new URL(viewer).host : null;
  const publicPath = /^\/[A-Za-z0-9]{10}$/.test(path);
  const viewerPath = /^\/view\/[A-Za-z0-9]{10}$/.test(path);
  const legacyPath = /^\/(?:view\/)?[a-f0-9]{32}$/.test(path);
  const viewerOnly = viewerHost === host && !trustedOrigins().some(origin => new URL(origin).host === host);
  const permitted = authMode() === "local-demo" ? loopbackHost(host) : trustedOrigins().some(origin => new URL(origin).host === host);
  if (!viewerOnly && !permitted && !path.startsWith("/api/health/")) return new NextResponse("Not found", { status: 404 });
  if (legacyPath) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  if (publicPath || viewerPath) {
    const retry = viewerLimit();
    if (retry) return new NextResponse("Too many requests", { status: 429, headers: {
      "Retry-After": String(retry), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
    } });
  }
  if (viewerOnly) {
    if (viewerPath) return viewerRedirect(new URL("/" + path.slice(6), viewer));
    if (!publicPath) return new NextResponse("Not found", { status: 404 });
    return viewerResponse(); // Never run Clerk or create auth cookies on the trusted viewer host.
  }
  if (viewerPath && viewer && viewerHost !== host) {
    return viewerRedirect(new URL("/" + path.slice(6), viewer));
  }
  if (publicPath && viewer && viewerHost !== host) return viewerRedirect(new URL(path, viewer));
  if (publicPath || viewerPath) return viewerResponse();
  if (clerkAvailable() && !publicPath && !path.startsWith("/view/") && !path.startsWith("/api/health/")) {
    return clerkMiddleware({ publishableKey: process.env.CLERK_PUBLISHABLE_KEY, authorizedParties: trustedOrigins() })(request, event);
  }
  return NextResponse.next();
}

function viewerRedirect(url: URL) {
  const response = NextResponse.redirect(url, 307);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
function viewerResponse() {
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src " + (process.env.GATEWAY_FRAME_SOURCE ?? "'none'") + "; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  return response;
}

// APIs authorize directly; matching an upload here would buffer/truncate its stream.
export const config = { matcher: ["/", "/:id", "/view/:path*", "/preview/:path*", "/sign-in/:path*", "/sign-out"] };
