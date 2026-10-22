import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import pg from "pg";
import { mapRequest, mapHostRequest, manifestEntry, securityHeaders } from "./gateway-policy.mjs";
import { publicOriginConfig } from "./origin-config.mjs";
export { mapRequest } from "./gateway-policy.mjs";

function loopbackHost(host) {return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/.test(host??"");}
export function gatewayConfig(env=process.env) {
  const mode=env.GATEWAY_MODE??"local-path";
  if(!["local-path","hostname"].includes(mode)) throw new Error("Invalid gateway mode");
  const viewerOrigin=env.GATEWAY_VIEWER_ORIGIN??"http://127.0.0.1:3100";
  const viewer=new URL(viewerOrigin);
  if(viewer.origin!==viewerOrigin || !["http:","https:"].includes(viewer.protocol)) throw new Error("Invalid viewer origin");
  const config={mode,viewerOrigin,...publicOriginConfig(env),
    previewOrigin:env.GATEWAY_PREVIEW_ORIGIN??viewerOrigin,
    reserved:(env.GATEWAY_RESERVED_HOSTS??"www,mail,api,admin,studio,view").split(",").map(value=>value.trim().toLowerCase())};
  if(new URL(config.previewOrigin).origin!==config.previewOrigin) throw new Error("Invalid preview origin");
  return config;
}
function respond(res,status,text) {
  res.writeHead(status,{"Content-Type":"text/plain; charset=utf-8","X-Content-Type-Options":"nosniff","Cache-Control":"no-store","Referrer-Policy":"no-referrer"});
  res.end(text);
}
export function createGateway({db,s3,bucket,config}) {
  return async function serve(req,res) {
    if(req.method!=="GET" && req.method!=="HEAD") return respond(res,405,"Method not allowed");
    if(req.url==="/health/live" && loopbackHost(req.headers.host)) return respond(res,200,"ok");
    const parsed=config.mode==="hostname" ? mapHostRequest(req.headers.host,req.url??"",config)
      : loopbackHost(req.headers.host) ? mapRequest(req.url??"") : null;
    if(!parsed) return respond(res,404,"Not found");
    try {
      const result=await db.query(parsed.grant
        ? `SELECT v.storage_prefix,v.asset_manifest FROM preview_grants g
           JOIN sites s ON s.id=g.site_id JOIN site_versions v ON v.site_id=s.id AND v.id=g.version_id
           JOIN users u ON u.id=g.actor_id LEFT JOIN auth_allowlist a ON a.email=u.email
           WHERE g.token_hash=$2 AND s.id=$1 AND s.status<>'deleted' AND g.expires_at>now()
             AND u.status='active' AND (u.external_identity='local-demo:owner' OR
               (u.external_identity LIKE 'clerk:%' AND a.status='active'))
             AND (s.owner_id=u.id OR COALESCE(a.role,u.role)='admin')`
        : `SELECT v.storage_prefix,v.asset_manifest FROM sites s JOIN site_versions v
           ON s.id=v.site_id AND s.active_version_id=v.id WHERE s.id=$1 AND s.status='published'`,
        parsed.grant ? [parsed.id,createHash("sha256").update(parsed.grant).digest("hex")] : [parsed.id]);
      const version=result.rows[0];
      const entry=version && manifestEntry(version.asset_manifest,parsed.asset,parsed.type);
      if(!entry || !new RegExp(`^${parsed.id}/[a-f0-9-]{36}$`).test(version.storage_prefix)) return respond(res,404,"Not found");
      let object;
      try {object=await s3.send(new GetObjectCommand({Bucket:bucket,Key:`${version.storage_prefix}/${parsed.asset}`}));}
      catch(error) {if(error?.$metadata?.httpStatusCode===404 || error?.name==="NoSuchKey") return respond(res,404,"Not found");throw error;}
      if(object.ContentLength!==entry.size) {object.Body?.destroy?.(); return respond(res,503,"Serving unavailable");}
      // Verify bytes against the validated immutable manifest before returning any content.
      const chunks=[];let size=0;
      for await(const chunk of object.Body) {size+=chunk.length;if(size>entry.size){object.Body.destroy?.();return respond(res,503,"Serving unavailable");}chunks.push(chunk);}
      const body=Buffer.concat(chunks);
      if(size!==entry.size || createHash("sha256").update(body).digest("hex")!==entry.sha256) return respond(res,503,"Serving unavailable");
      res.writeHead(200,{...securityHeaders(parsed.type,config,Boolean(parsed.grant)),"Content-Length":String(body.length)});
      res.end(req.method==="HEAD" ? undefined : body);
    } catch { // Never log object content, token hostname, cookie, key or provider error.
      console.error("gateway.read_failed");
      if(!res.headersSent) respond(res,503,"Serving unavailable");else res.destroy();
    }
  };
}
if(process.argv[1]?.endsWith("gateway.mjs")) {
  const db=new pg.Pool({connectionTimeoutMillis:5000,max:8});
  const s3=new S3Client({region:process.env.STORAGE_REGION??"auto",endpoint:process.env.STORAGE_ENDPOINT,forcePathStyle:true,
    credentials:{accessKeyId:process.env.STORAGE_ACCESS_KEY??"",secretAccessKey:process.env.STORAGE_SECRET_KEY??""}});
  const serve=createGateway({db,s3,bucket:process.env.STORAGE_BUCKET??"html-share-local",config:gatewayConfig()});
  createServer((req,res)=>{void serve(req,res);}).listen(Number(process.env.GATEWAY_INTERNAL_PORT??4000),"0.0.0.0",()=>console.log("Static sandbox gateway ready"));
}
