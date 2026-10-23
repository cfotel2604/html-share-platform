import { randomUUID } from "node:crypto";
import { UploadError } from "./upload-error";
export type PilotIdentity={id:string;role:"employee"|"admin"};
export async function cloudflareReady() {
  const raw=process.env.CLOUDFLARE_API_ORIGIN,secret=process.env.CLOUDFLARE_SERVICE_TOKEN;
  if(!raw||!secret||secret.length<32) throw new Error("Pilot unavailable");
  const url=new URL(raw);
  if(url.origin!==raw||(url.protocol!=="https:"&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))) throw new Error("Unsafe API origin");
  const res=await fetch(raw+'/internal/health',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(3000),headers:{'X-HSP-Service-Token':secret}});
  if(!res.ok||(await res.json()).status!=='ready') throw new Error("Pilot unavailable");
}
export function cloudflareClient(token:string,fetcher:typeof fetch=fetch) {
  const raw=process.env.CLOUDFLARE_API_ORIGIN,secret=process.env.CLOUDFLARE_SERVICE_TOKEN;
  if(!raw||!secret||secret.length<32||!token) throw new UploadError("Pilot chưa được cấu hình",503);
  const url=new URL(raw);
  if(url.origin!==raw||(url.protocol!=="https:"&&!['127.0.0.1','localhost','[::1]'].includes(url.hostname))) throw new UploadError("Pilot API origin không hợp lệ",503);
  return async function rpc<T>(path:string,method="GET",body?:unknown,key:string=randomUUID()):Promise<T> {
    if(!path.startsWith('/v1/')||path.includes('..')||path.includes('?')) throw new UploadError("Pilot API path không hợp lệ",400);
    for(let attempt=0;attempt<2;attempt++) {
      try {
        const response=await fetcher(raw+path,{method,redirect:"error",cache:"no-store",signal:AbortSignal.timeout(15_000),
          headers:{Authorization:`Bearer ${token}`,"X-HSP-Service-Token":secret,"Content-Type":"application/json",...(method!=="GET"?{"Idempotency-Key":key}:{})},
          body:body===undefined?undefined:JSON.stringify(body)});
        if(response.status>=500) {await response.body?.cancel();if(attempt===0) continue;throw new UploadError("Pilot tạm thời không xác nhận được kết quả",503);}
        if(!response.ok) {
          await response.body?.cancel();
          const status=[400,401,403,404,409,413,429].includes(response.status)?response.status:503;
          throw new UploadError("Pilot từ chối yêu cầu; hãy tải lại danh sách",status as ConstructorParameters<typeof UploadError>[1]);
        }
        return await response.json() as T;
      } catch(error) {
        if(error instanceof UploadError) throw error;
        if(attempt===1) throw new UploadError("Chưa xác nhận được kết quả pilot. Hãy tải lại trước khi thử lại.",503);
      }
    }
    throw new UploadError("Pilot unavailable",503);
  };
}
