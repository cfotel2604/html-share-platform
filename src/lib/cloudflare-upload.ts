import { createHash,randomUUID } from "node:crypto";
import { S3Client,PutObjectCommand,GetObjectCommand } from "@aws-sdk/client-s3";
import { parseSite } from "./upload";
import { UploadError } from "./upload-error";
import { cloudflareClient } from "./cloudflare-rpc";
type Intent={id:string;siteId:string;versionId:string;storagePrefix:string;expiresAt:string};
type Asset={path:string;type:string;size:number;sha256:string;etag:string};
type Result={id:string;fileCount:number};
type Rpc=<T>(path:string,method?:string,body?:unknown,key?:string)=>Promise<T>;
type ObjectStore={put:(key:string,body:Buffer,type:string)=>Promise<string>;read:(key:string,etag:string)=>Promise<{etag:string;body:AsyncIterable<Uint8Array>}>};
export function pilotObjectStore():ObjectStore {
  const endpoint=process.env.CLOUDFLARE_R2_ENDPOINT,bucket=process.env.CLOUDFLARE_R2_BUCKET;
  const accessKeyId=process.env.CLOUDFLARE_R2_ACCESS_KEY,secretAccessKey=process.env.CLOUDFLARE_R2_SECRET_KEY;
  if(!endpoint||!bucket||!accessKeyId||!secretAccessKey) throw new UploadError("Private R2 chưa được cấu hình",503);
  const url=new URL(endpoint);
  if(url.protocol!=="https:"||!url.hostname.endsWith('.r2.cloudflarestorage.com')) throw new UploadError("Private R2 endpoint không hợp lệ",503);
  const client=new S3Client({endpoint,region:"auto",forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED"});
  return {
    async put(key,body,type) {
      const result=await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:body,ContentType:type,IfNoneMatch:"*"}));
      if(!result.ETag) throw new Error("Missing object identity");return result.ETag.replace(/^"|"$/g,'');
    },
    async read(key,etag) {
      const result=await client.send(new GetObjectCommand({Bucket:bucket,Key:key,IfMatch:`"${etag}"`}));
      if(!result.Body||!result.ETag) throw new Error("Object verification unavailable");
      return {etag:result.ETag.replace(/^"|"$/g,''),body:result.Body as AsyncIterable<Uint8Array>};
    },
  };
}
export async function runPilotUpload(rpc:Rpc,store:ObjectStore,file:File,name:string,siteId?:string):Promise<Result> {
  if(!name.trim()||name.length>100) throw new UploadError("Tên website phải có 1–100 ký tự",400);
  // Same-origin route authenticates and preflights ownership before parsing multipart.
  const intent=await rpc<Intent>('/v1/uploads','POST',{name,...(siteId?{siteId}:{})},randomUUID());
  if(intent.storagePrefix!==`${intent.siteId}/${intent.versionId}`||!/^[a-f0-9]{32}\/[a-f0-9-]{36}$/.test(intent.storagePrefix)) throw new UploadError("Pilot intent không hợp lệ",503);
  let finalizeAttempted=false;const finalKey=randomUUID();
  try {
    let files;
    try{files=await parseSite(file);}catch{throw new UploadError("HTML/ZIP không hợp lệ hoặc vượt quota",400);}
    const assets:Asset[]=[];
    for(const asset of files) {
      const key=intent.storagePrefix+'/'+asset.path,sha256=createHash('sha256').update(asset.body).digest('hex');
      const etag=await store.put(key,asset.body,asset.type),read=await store.read(key,etag);
      const digest=createHash('sha256');let count=0;
      for await(const chunk of read.body) {count+=chunk.byteLength;if(count>asset.body.length) throw new Error("Object grew");digest.update(chunk);}
      if(count!==asset.body.length||digest.digest('hex')!==sha256||read.etag!==etag) throw new Error("Object verification failed");
      assets.push({path:asset.path,type:asset.type,size:count,sha256,etag});
    }
    finalizeAttempted=true;
    try{return await rpc<Result>(`/v1/uploads/${intent.id}/finalize`,'POST',{assets},finalKey);}
    catch {
      try {
        const saved=await rpc<{action:string;result:Result}>('/v1/receipts/'+finalKey);
        if(saved.action==='upload.finalize:'+intent.id) return saved.result;
      } catch { /* uncertain means retain private objects, never guess a rollback */ }
      throw new UploadError("Chưa xác nhận publish. Hãy tải lại; không upload lặp ngay.",503);
    }
  } catch(error) {
    if(!finalizeAttempted) {
      try {
        await rpc(`/v1/uploads/${intent.id}/abort`,'POST',{},randomUUID());
        await rpc(`/v1/uploads/${intent.id}/cleanup`,'POST',{},randomUUID());
      } catch {console.warn('pilot.cleanup_required');}
    }
    if(error instanceof UploadError) throw error;
    throw new UploadError("Upload pilot chưa hoàn tất",503);
  }
}
export async function uploadPilot(token:string,file:File,name:string,siteId?:string) {
  return runPilotUpload(cloudflareClient(token),pilotObjectStore(),file,name,siteId);
}
