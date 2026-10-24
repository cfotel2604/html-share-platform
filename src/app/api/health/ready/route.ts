import { Client } from "pg";
import { assertPostgresBackend } from "../../../../../scripts/metadata-backend.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try { assertPostgresBackend(); }
  catch { return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  const client = new Client({
    connectionTimeoutMillis: 2000,
    query_timeout: 2000,
  });

  try {
    await client.connect();
    await client.query("SELECT 1");
    return Response.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await client.end().catch(() => undefined);
  }
}
