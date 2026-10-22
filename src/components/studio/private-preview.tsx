"use client";
import { useEffect,useState } from "react";
import { studioApi } from "@/features/studio/api";
export function PrivatePreview({id}:{id:string}) {
  const [preview,setPreview]=useState<{url:string;displayName:string;expiresAt:string}|null>(null);
  const [error,setError]=useState("");
  useEffect(()=>{let active=true;studioApi.preview(id).then(result=>{if(active)setPreview(result);}).catch(()=>{if(active)setError("Chưa thể mở bản xem riêng. Hãy kiểm tra quyền truy cập và thử lại.");});return()=>{active=false;};},[id]);
  if(error) return <main className="studio-main" role="alert">{error}</main>;
  if(!preview) return <main className="studio-main" role="status">Đang mở bản xem riêng…</main>;
  return <main className="h-dvh w-full overflow-hidden">
    <iframe title={preview.displayName} src={preview.url} sandbox="allow-scripts" referrerPolicy="no-referrer" className="block h-full w-full border-0 bg-white" />
  </main>;
}
