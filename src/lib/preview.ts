import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";
import { lockActor, type Actor } from "./auth-policy";
import { UploadError } from "./upload-error";
import { previewSiteUrl } from "./public-url";

function base32(bytes: Buffer) {
  const alphabet="abcdefghijklmnopqrstuvwxyz234567";let out="",value=0,bits=0;
  for (const byte of bytes) {value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5;}}
  if(bits) out+=alphabet[(value<<(5-bits))&31];return out;
}
export async function createPreview(actor: Actor,id: string) {
  const token=base32(randomBytes(16)),url=previewSiteUrl(id,token);
  const client=await db().connect();
  try {
    await client.query("BEGIN");
    const current=await lockActor(client,actor);
    const result=await client.query<{display_name:string;active_version_id:string}>(
      `SELECT display_name,active_version_id FROM sites WHERE id=$1 AND (owner_id=$2 OR $3='admin')
       AND status<>'deleted' AND active_version_id IS NOT NULL FOR SHARE`,[id,current.id,current.role]);
    if(!result.rowCount) throw new UploadError("Không tìm thấy website",404);
    const grant=await client.query<{expires_at:Date}>(
      `INSERT INTO preview_grants(token_hash,site_id,version_id,actor_id,expires_at) VALUES($1,$2,$3,$4,now()+interval '3 minutes') RETURNING expires_at`,
      [createHash("sha256").update(token).digest("hex"),id,result.rows[0].active_version_id,current.id]);
    await client.query("INSERT INTO audit_events(actor_id,action,target_type,target_id) VALUES($1,'site.preview','site',$2)",[current.id,id]);
    await client.query("COMMIT");
    return {url,displayName:result.rows[0].display_name,expiresAt:grant.rows[0].expires_at.toISOString()};
  } catch(error) {await client.query("ROLLBACK");throw error;} finally {client.release();}
}
