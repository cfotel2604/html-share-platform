import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicSiteUrl } from "@/lib/public-url";
import { resolveViewerSite } from "@/lib/share-links";
import { metadataBackend } from "@/lib/metadata-backend";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if(metadataBackend()==='cloudflare') notFound();
  const { id } = await params;
  const site = await resolveViewerSite(id);
  return { title: site ? `${site.display_name} · ODS Preview` : "Preview chưa có",
    description: "Xem trang HTML được chia sẻ từ ODS." };
}

export default async function ViewPage({ params }: Props) {
  if(metadataBackend()==='cloudflare') notFound();
  const { id } = await params;
  const site = await resolveViewerSite(id);
  if (!site) notFound();
  const url = publicSiteUrl(site.id);
  return (
    <main className="h-dvh w-full overflow-hidden">
      <iframe
        title={site.display_name}
        src={url}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="block h-full w-full border-0 bg-white"
      />
    </main>
  );
}
