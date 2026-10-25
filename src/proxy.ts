import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { authMode, clerkAvailable, loopbackHost, trustedOrigins } from "@/lib/auth-config";

export default async function proxy(request: NextRequest, event: NextFetchEvent) {
  const host = request.headers.get("host") ?? "", path = request.nextUrl.pathname;
  const retiredPublicPath = /^\/view(?:\/|$)/.test(path) || /^\/(?:[A-Za-z0-9]{10}|[a-f0-9]{32})\/?$/.test(path);
  if (retiredPublicPath) return new NextResponse("Not found", { status: 404, headers: {
    "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
  } });
  const permitted = authMode() === "local-demo" ? loopbackHost(host) : trustedOrigins().some(origin => new URL(origin).host === host);
  if (!permitted && !path.startsWith("/api/health/")) return new NextResponse("Not found", { status: 404 });
  if (clerkAvailable() && !path.startsWith("/api/health/")) {
    return clerkMiddleware({ publishableKey: process.env.CLERK_PUBLISHABLE_KEY, authorizedParties: trustedOrigins() })(request, event);
  }
  return NextResponse.next();
}

// APIs authorize directly; matching an upload here would buffer/truncate its stream.
export const config = { matcher: ["/", "/:id", "/view/:path*", "/preview/:path*", "/sign-in/:path*", "/sign-out"] };
