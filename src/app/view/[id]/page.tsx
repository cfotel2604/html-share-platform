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
    <main className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-700">ODS · Local preview</p>
          <h1 className="text-base font-semibold text-slate-900">{site.display_name}</h1>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">Demo trên máy</span>
      </header>
      <iframe
        title={site.display_name}
        src={url}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="min-h-[calc(100vh-67px)] w-full flex-1 border-0 bg-white"
      />
    </main>
  );
}
