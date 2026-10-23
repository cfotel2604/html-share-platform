import { Client } from "pg";
import { metadataBackend } from "@/lib/metadata-backend";
import { cloudflareReady } from "@/lib/cloudflare-rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if(metadataBackend()==='cloudflare') {
    try {await cloudflareReady();return Response.json({status:'ready'},{headers:{'Cache-Control':'no-store'}});}
    catch {return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
  }
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
