import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { authMode, clerkAvailable, loopbackHost, trustedOrigins } from "@/lib/auth-config";

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const host = request.headers.get("host") ?? "", path = request.nextUrl.pathname;
  const viewer = process.env.VIEWER_PUBLIC_ORIGIN;
  const viewerHost = viewer ? new URL(viewer).host : null;
  const publicPath = /^\/[a-f0-9]{32}$/.test(path);
  if (viewerHost === host && !trustedOrigins().some(origin => new URL(origin).host === host)) {
    if (path.startsWith("/view/")) return NextResponse.redirect(new URL("/" + path.slice(6), viewer), 307);
    if (!publicPath) return new NextResponse("Not found", { status: 404 });
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-src " + (process.env.GATEWAY_FRAME_SOURCE ?? "'none'") + "; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    return response; // Never run Clerk or create auth cookies on the trusted viewer host.
  }
  const permitted = authMode() === "local-demo" ? loopbackHost(host) : trustedOrigins().some(origin => new URL(origin).host === host);
  if (!permitted && !path.startsWith("/api/health/")) return new NextResponse("Not found", { status: 404 });
  if (path.startsWith("/view/") && viewer && viewerHost !== host) {
    return NextResponse.redirect(new URL("/" + path.slice(6), viewer), 307);
  }
  if (publicPath && viewer && viewerHost !== host) return NextResponse.redirect(new URL(path, viewer), 307);
  if (clerkAvailable() && !publicPath && !path.startsWith("/view/") && !path.startsWith("/api/health/")) {
    return clerkMiddleware({ publishableKey: process.env.CLERK_PUBLISHABLE_KEY, authorizedParties: trustedOrigins() })(request, event);
  }
  return NextResponse.next();
}

// APIs authorize directly; matching an upload here would buffer/truncate its stream.
export const config = { matcher: ["/", "/:id", "/view/:path*", "/preview/:path*", "/sign-in/:path*", "/sign-out"] };
