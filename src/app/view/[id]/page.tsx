import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

async function getSite(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) return null;
  const result = await db().query<{ display_name: string }>(
    "SELECT display_name FROM sites WHERE id = $1 AND status = 'published' AND active_version_id IS NOT NULL",
    [id],
  );
  return result.rows[0] ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const site = await getSite(id);
  return { title: site ? `${site.display_name} · ODS Preview` : "Preview chưa có",
    description: "Xem trang HTML được chia sẻ từ ODS." };
}

export default async function ViewPage({ params }: Props) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) notFound();
  const gateway = process.env.GATEWAY_PUBLIC_ORIGIN ?? "http://127.0.0.1:4100";
  const url = `${gateway}/s/${id}/`;
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
