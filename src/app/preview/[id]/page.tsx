import { requireActor } from "@/lib/auth";
import { assertSiteOwner } from "@/lib/site-ops";
import { PrivatePreview } from "@/components/studio/private-preview";
import { notFound } from "next/navigation";
export const dynamic="force-dynamic";
export default async function PreviewPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[a-f0-9]{32}$/.test(id)) notFound();
  try {await assertSiteOwner(await requireActor(),id);} catch {notFound();}
  return <PrivatePreview id={id} />;
}
