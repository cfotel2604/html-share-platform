export function authMode() {
  const mode = process.env.AUTH_MODE ?? (process.env.LOCAL_DEMO_MODE === "1" ? "local-demo" : "disabled");
  return mode === "clerk" || mode === "local-demo" ? mode : "disabled";
}

export function trustedOrigins() {
  return (process.env.AUTH_TRUSTED_ORIGINS ?? "http://127.0.0.1:3100,http://localhost:3100")
    .split(",").map(value => value.trim()).filter(value => {
      try { const url = new URL(value); return url.origin === value && ["http:", "https:"].includes(url.protocol); }
      catch { return false; }
    });
}

export function clerkAvailable() {
  return authMode() === "clerk" && Boolean(process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY);
}

export function dashboardHost(host: string) {
  return trustedOrigins().some(origin => new URL(origin).host === host) &&
    (authMode() !== "local-demo" || loopbackHost(host));
}

export function loopbackHost(host: string) {
  try { return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(`http://${host}`).hostname); }
  catch { return false; }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin"), host = request.headers.get("host");
  if (!origin || !host || !trustedOrigins().includes(origin)) return false;
  try { return new URL(origin).host === host && request.headers.get("sec-fetch-site") !== "cross-site"; }
  catch { return false; }
}
