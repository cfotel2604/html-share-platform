import { createHash } from "node:crypto";
import { S3Client,ListObjectsV2Command,GetObjectCommand } from "@aws-sdk/client-s3";
import pg from "pg";
import { validAsset,TYPES } from "./gateway-policy.mjs";

export async function backfill(pool,s3,bucket) {
  const versions=await pool.query("SELECT id,site_id,storage_prefix,manifest_hash FROM site_versions WHERE asset_manifest IS NULL ORDER BY created_at");
  let verified=0;
  for(const version of versions.rows) {
    if(!new RegExp(`^${version.site_id}/[a-f0-9-]{36}$`).test(version.storage_prefix)) throw new Error("Invalid immutable prefix");
    const prefix=version.storage_prefix+"/",files=[];let token,total=0;
    do {
      const listing=await s3.send(new ListObjectsV2Command({Bucket:bucket,Prefix:prefix,ContinuationToken:token}));
      for(const item of listing.Contents??[]) {
        const path=item.Key.slice(prefix.length),type=TYPES.get(/\.[^.\/]+$/.exec(path)?.[0]?.toLowerCase());
        if(!validAsset(path) || !type || files.length>=500 || !Number.isSafeInteger(item.Size) || (total+=item.Size)>100*1024*1024) throw new Error("Invalid legacy version");
        const object=await s3.send(new GetObjectCommand({Bucket:bucket,Key:item.Key}));
        const chunks=[];let size=0;for await(const chunk of object.Body){size+=chunk.length;if(size>item.Size){object.Body.destroy?.();throw new Error("Invalid legacy size");}chunks.push(chunk);}
        if(size!==item.Size) throw new Error("Invalid legacy size");
        files.push({path,type,size,sha256:createHash("sha256").update(Buffer.concat(chunks)).digest("hex")});
      }
      token=listing.NextContinuationToken;
    } while(token);
    if(!files.some(file=>file.path==="index.html")) throw new Error("Missing legacy index");
    const fingerprint=createHash("sha256");
    for(const file of [...files].sort((a,b)=>a.path.localeCompare(b.path))) fingerprint.update(file.path).update("\0").update(Buffer.from(file.sha256,"hex"));
    if(fingerprint.digest("hex")!==version.manifest_hash) throw new Error("Legacy version fingerprint mismatch");
    await pool.query("UPDATE site_versions SET asset_manifest=$2::jsonb WHERE id=$1 AND asset_manifest IS NULL",[version.id,JSON.stringify(files)]);
    verified++;
  }
  return verified;
}
if(process.argv[1]?.endsWith("backfill-manifests.mjs")) {
  const pool=new pg.Pool(),s3=new S3Client({region:process.env.STORAGE_REGION??"auto",endpoint:process.env.STORAGE_ENDPOINT,forcePathStyle:true,
    credentials:{accessKeyId:process.env.STORAGE_ACCESS_KEY??"",secretAccessKey:process.env.STORAGE_SECRET_KEY??""}});
  try {console.log("Verified legacy manifests:",await backfill(pool,s3,process.env.STORAGE_BUCKET??"html-share-local"));}
  catch {console.error("Manifest backfill failed closed; no assets or identities logged.");process.exitCode=1;}
  finally {await pool.end();s3.destroy();}
}
