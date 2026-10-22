import { createServer } from "node:http";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import pg from "pg";

// Separate serving process/origin: untrusted uploads never reach the Next.js origin.
// Local lab only; P4 will provide per-site hostnames, Cloudflare TLS and DNS inventory.
const port = Number(process.env.GATEWAY_INTERNAL_PORT ?? 4000);
const bucket = process.env.STORAGE_BUCKET ?? "html-share-local";
const frameAncestor = process.env.GATEWAY_VIEWER_ORIGIN ?? "http://localhost:3100";
const db = new pg.Pool({ connectionTimeoutMillis: 5000, max: 8 });
const s3 = new S3Client({
  region: process.env.STORAGE_REGION ?? "us-east-1",
  endpoint: process.env.STORAGE_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY ?? "",
    secretAccessKey: process.env.STORAGE_SECRET_KEY ?? "",
  },
});

const TYPES = new Map([
  [".html", "text/html; charset=utf-8"], [".htm", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"], [".png", "image/png"],
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".gif", "image/gif"],
  [".webp", "image/webp"], [".ico", "image/x-icon"],
  [".woff", "font/woff"], [".woff2", "font/woff2"],
  [".ttf", "font/ttf"], [".otf", "font/otf"],
]);

function validAsset(path) {
  const parts = path.split("/");
  return path.length > 0 && path.length <= 255 && !/[\\\x00-\x1f\x7f?#%]/.test(path) &&
    !path.startsWith("/") && parts.length <= 12 &&
    parts.every((part) => part && part !== "." && part !== "..");
}

export function mapRequest(rawUrl) {
  const raw = rawUrl.split("?")[0];
  const match = /^\/s\/([a-f0-9]{32})\/(.*)$/.exec(raw);
  if (!match || /%(?:2f|5c|00|25)/i.test(raw)) return null;
  let asset;
  try { asset = decodeURIComponent(match[2]); } catch { return null; }
  asset ||= "index.html";
  if (!validAsset(asset)) return null;
  const extension = /\.[^.\/]+$/.exec(asset)?.[0]?.toLowerCase();
  const type = TYPES.get(extension);
  if (!type) return null;
  return { id: match[1], asset, type };
}

function respond(res, status, text) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

export async function serve(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return respond(res, 405, "Method not allowed");
  if (req.url === "/health/live") return respond(res, 200, "ok");
  const parsed = mapRequest(req.url ?? "");
  if (!parsed) return respond(res, 404, "Not found");
  try {
    const result = await db.query(
      `SELECT v.storage_prefix FROM sites s
       JOIN site_versions v ON (s.id = v.site_id AND s.active_version_id = v.id)
       WHERE s.id = $1 AND s.status = 'published'`,
      [parsed.id],
    );
    if (!result.rowCount) return respond(res, 404, "Not found");
    let object;
    try {
      object = await s3.send(new GetObjectCommand({
        Bucket: bucket,
        Key: `${result.rows[0].storage_prefix}/${parsed.asset}`,
      }));
    } catch (error) {
      if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NoSuchKey") {
        return respond(res, 404, "Not found");
      }
      throw error;
    }
    const html = parsed.type.startsWith("text/html");
    const headers = {
      "Content-Type": parsed.type,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": html
        ? `sandbox allow-scripts; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${frameAncestor}`
        : `object-src 'none'; frame-ancestors ${frameAncestor}`,
    };
    res.writeHead(200, headers);
    if (req.method === "HEAD") { object.Body?.destroy?.(); res.end(); return; }
    const body = object.Body;
    if (body && typeof body.pipe === "function") {
      body.on("error", () => res.destroy());
      body.pipe(res);
    } else {
      res.end(Buffer.from(await body.transformToByteArray()));
    }
  } catch (error) {
    console.error("Gateway read failed:", error instanceof Error ? error.message : "unknown");
    if (!res.headersSent) respond(res, 503, "Serving unavailable");
    else res.destroy();
  }
}

if (process.argv[1]?.endsWith("gateway.mjs")) {
  createServer((req, res) => { void serve(req, res); }).listen(port, "0.0.0.0", () => {
    console.log(`Static sandbox gateway listening on ${port}`);
  });
}
