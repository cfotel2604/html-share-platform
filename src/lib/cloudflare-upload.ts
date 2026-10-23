import { createHash,randomUUID } from "node:crypto";
import { S3Client,PutObjectCommand,GetObjectCommand } from "@aws-sdk/client-s3";
import { parseSite } from "./upload";
import { UploadError } from "./upload-error";
import { cloudflareClient } from "./cloudflare-rpc";
import type { SessionTokenProvider } from "./cloudflare-token";
import { untilAborted } from "./cloudflare-deadline";
import type { Readable } from "node:stream";
type Intent={id:string;siteId:string;versionId:string;storagePrefix:string;expiresAt:string};
type Asset={path:string;type:string;size:number;sha256:string;etag:string};
type Result={id:string;fileCount:number};
type Rpc=<T>(path:string,method?:string,body?:unknown,key?:string,signal?:AbortSignal)=>Promise<T>;
type ObjectStore={
  put:(key:string,body:Buffer,type:string,signal:AbortSignal)=>Promise<string>;
  read:(key:string,etag:string,signal:AbortSignal)=>Promise<{etag:string;body:AsyncIterable<Uint8Array>}>;
  close?:()=>void;
};
type UploadOptions={signal?:AbortSignal;timeoutMs?:number;objectTimeoutMs?:number};
const UPLOAD_TIMEOUT_MS=15*60_000,OBJECT_TIMEOUT_MS=30_000,FINALIZE_RESERVE_MS=60_000;
export function pilotObjectStore():ObjectStore {
  const endpoint=process.env.CLOUDFLARE_R2_ENDPOINT,bucket=process.env.CLOUDFLARE_R2_BUCKET;
  const accessKeyId=process.env.CLOUDFLARE_R2_ACCESS_KEY,secretAccessKey=process.env.CLOUDFLARE_R2_SECRET_KEY;
  if(!endpoint||!bucket||!accessKeyId||!secretAccessKey) throw new UploadError("Private R2 chưa được cấu hình",503);
  const url=new URL(endpoint);
  if(url.protocol!=="https:"||!url.hostname.endsWith('.r2.cloudflarestorage.com')) throw new UploadError("Private R2 endpoint không hợp lệ",503);
  const client=new S3Client({endpoint,region:"auto",forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},requestChecksumCalculation:"WHEN_REQUIRED",responseChecksumValidation:"WHEN_REQUIRED"});
  return {
    async put(key,body,type,signal) {
      const result=await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:body,ContentType:type,IfNoneMatch:"*"}),{abortSignal:signal});
      if(!result.ETag) throw new Error("Missing object identity");return result.ETag.replace(/^"|"$/g,'');
    },
    async read(key,etag,signal) {
      const result=await client.send(new GetObjectCommand({Bucket:bucket,Key:key,IfMatch:`"${etag}"`}),{abortSignal:signal});
      const source=result.Body as Readable|undefined;
      if(!source||!result.ETag) {source?.destroy();throw new Error("Object verification unavailable");}
      // SDK request cancellation alone may stop at headers. Also close a stalled body.
      const abort=()=>{source.destroy();};
      signal.addEventListener('abort',abort,{once:true});
      if(signal.aborted) abort();
      return {etag:result.ETag.replace(/^"|"$/g,''),body:(async function*(){
        try {
          signal.throwIfAborted();
          for await(const chunk of source) {signal.throwIfAborted();yield chunk as Uint8Array;}
        } finally {signal.removeEventListener('abort',abort);source.destroy();}
      })()};
    },
    close:()=>client.destroy(),
  };
}
export async function runPilotUpload(rpc:Rpc,store:ObjectStore,file:File,name:string,siteId?:string,options:UploadOptions={}):Promise<Result> {
  if(!name.trim()||name.length>100) throw new UploadError("Tên website phải có 1–100 ký tự",400);
  const timeoutMs=options.timeoutMs??UPLOAD_TIMEOUT_MS,objectTimeoutMs=options.objectTimeoutMs??OBJECT_TIMEOUT_MS;
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>UPLOAD_TIMEOUT_MS||
      !Number.isInteger(objectTimeoutMs)||objectTimeoutMs<1||objectTimeoutMs>OBJECT_TIMEOUT_MS) throw new UploadError("Upload deadline không hợp lệ",503);
  // Same-origin route authenticates and preflights ownership before parsing multipart.
  const intent=await rpc<Intent>('/v1/uploads','POST',{name,...(siteId?{siteId}:{})},randomUUID(),options.signal);
  if(intent.storagePrefix!==`${intent.siteId}/${intent.versionId}`||!/^[a-f0-9]{32}\/[a-f0-9-]{36}$/.test(intent.storagePrefix)) throw new UploadError("Pilot intent không hợp lệ",503);
  let finalizeAttempted=false;const finalKey=randomUUID();
  try {
    const remaining=Date.parse(intent.expiresAt)-Date.now()-FINALIZE_RESERVE_MS;
    if(!Number.isFinite(remaining)||remaining<=0) throw new UploadError("Upload intent đã hết thời gian ghi",409);
    const signal=AbortSignal.any([AbortSignal.timeout(Math.min(timeoutMs,remaining)),...(options.signal?[options.signal]:[])]);
    const bounded=<T>(work:(operation:AbortSignal)=>Promise<T>)=>{
      const operation=AbortSignal.any([signal,AbortSignal.timeout(objectTimeoutMs)]);
      return untilAborted(()=>work(operation),operation);
    };
    let files;
    try{files=await untilAborted(()=>parseSite(file),signal);}catch(error){
      if(signal.aborted) throw error;
      throw new UploadError("HTML/ZIP không hợp lệ hoặc vượt quota",400);
    }
    const assets:Asset[]=[];
    for(const asset of files) {
      const key=intent.storagePrefix+'/'+asset.path,sha256=createHash('sha256').update(asset.body).digest('hex');
      const etag=await bounded(operation=>store.put(key,asset.body,asset.type,operation));
      await bounded(async operation=>{
        const read=await store.read(key,etag,operation);
        const digest=createHash('sha256');let count=0;
        for await(const chunk of read.body) {operation.throwIfAborted();count+=chunk.byteLength;if(count>asset.body.length) throw new Error("Object grew");digest.update(chunk);}
        operation.throwIfAborted();
        if(count!==asset.body.length||digest.digest('hex')!==sha256||read.etag!==etag) throw new Error("Object verification failed");
        assets.push({path:asset.path,type:asset.type,size:count,sha256,etag});
      });
    }
    signal.throwIfAborted();
    finalizeAttempted=true;
    try{return await rpc<Result>(`/v1/uploads/${intent.id}/finalize`,'POST',{assets},finalKey,signal);}
    catch {
      try {
        // Recovery has its own RPC deadline, even if the write/request was cancelled.
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
export async function uploadPilot(getToken:SessionTokenProvider|undefined,file:File,name:string,siteId?:string,signal?:AbortSignal) {
  const store=pilotObjectStore();
  try {return await runPilotUpload(cloudflareClient(getToken),store,file,name,siteId,{signal});}
  finally {store.close?.();}
}
