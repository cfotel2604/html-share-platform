"use client";

import { useEffect, useState, type FormEvent } from "react";

type Site = {
  id: string;
  display_name: string;
  status: "draft" | "published" | "unpublished";
  updated_at: string;
};

async function api(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Yêu cầu không thành công");
  return data;
}

export default function Workbench() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [available, setAvailable] = useState(false);
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [upload, setUpload] = useState<File | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadSites() {
    const data = await api("/api/sites");
    setSites(data.sites);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = await api("/api/auth");
        if (!active) return;
        setAvailable(auth.demoAvailable);
        setSignedIn(auth.signedIn);
        if (auth.signedIn) {
          const result = await api("/api/sites");
          if (active) setSites(result.sites);
        }
      } catch {
        if (active) setError("Không kết nối được tới máy chủ. Kiểm tra Docker Compose.");
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy("login");
    try {
      await api("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setSignedIn(true);
      await loadSites();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Đăng nhập thất bại");
    } finally { setBusy(""); }
  }

  async function logout() {
    setError("");
    setBusy("logout");
    try {
      await api("/api/auth", { method: "DELETE" });
      setSites([]);
      setSignedIn(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng xuất");
    } finally { setBusy(""); }
  }

  async function createSite(event: FormEvent) {
    event.preventDefault();
    if (!upload) { setError("Hãy chọn file HTML hoặc ZIP"); return; }
    setError("");
    setNotice("");
    setBusy("upload");
    const form = new FormData();
    form.set("file", upload);
    form.set("name", name);
    try {
      const created = await api("/api/sites", { method: "POST", body: form });
      setNotice(`Đã xuất bản ${created.fileCount} file. Mở link xem thử bên dưới.`);
      setName("");
      setUpload(null);
      const input = document.querySelector<HTMLInputElement>("#new-upload");
      if (input) input.value = "";
      await loadSites();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload thất bại");
    } finally { setBusy(""); }
  }

  async function updateSite(site: Site, file: File | undefined) {
    if (!file) return;
    setBusy(site.id);
    setError("");
    setNotice("");
    const form = new FormData();
    form.set("file", file);
    form.set("name", site.display_name);
    try {
      await api(`/api/sites/${site.id}`, { method: "PUT", body: form });
      setNotice(`Đã cập nhật “${site.display_name}”. Link chia sẻ được giữ nguyên.`);
      await loadSites();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cập nhật thất bại");
    } finally { setBusy(""); }
  }

  async function toggleSite(site: Site) {
    setBusy(site.id);
    setError("");
    setNotice("");
    try {
      await api(`/api/sites/${site.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: site.status !== "published" }),
      });
      setNotice(site.status === "published" ? "Đã tắt link công khai." : "Đã xuất bản lại website.");
      await loadSites();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Đổi trạng thái thất bại");
    } finally { setBusy(""); }
  }

  return (
    <main className="min-h-screen bg-[#f3f7fb] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-700 text-lg font-black tracking-tighter text-white">ODS</div>
            <div>
              <p className="text-base font-extrabold tracking-tight">Studio <span className="font-normal text-slate-400">/ HTML Share</span></p>
              <p className="text-xs text-slate-500">Workspace thử nghiệm · Local MVP</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 sm:inline-flex">● Chỉ chạy trên máy</span>
            {signedIn && <button type="button" onClick={logout} disabled={Boolean(busy)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50">Đăng xuất</button>}
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="mb-9 rounded-2xl bg-gradient-to-r from-slate-900 to-sky-900 px-7 py-9 text-white shadow-lg shadow-slate-900/10 sm:px-10">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wider text-sky-100">PREVIEW ENVIRONMENT</span>
          <h1 className="mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">Chia sẻ website HTML trong vài bước.</h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-sky-100">Upload file HTML hoặc ZIP chứa index.html, nhận link xem thử ngay trên máy. Nội dung chạy trong iframe sandbox trên cổng phục vụ riêng.</p>
        </div>
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-900">{notice}</div>}
        {checking ? (
          <p className="text-sm text-slate-500">Đang kiểm tra phiên làm việc...</p>
        ) : !available ? (
          <section className="rounded-2xl border border-amber-200 bg-white p-8">
            <h2 className="text-xl font-semibold">Chế độ demo chưa sẵn sàng</h2>
            <p className="mt-2 text-sm text-slate-600">Bật LOCAL_DEMO_MODE=1, đặt mật khẩu và session secret trong .env, sau đó chạy Docker Compose.</p>
          </section>
        ) : !signedIn ? (
          <section className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold">Đăng nhập demo nội bộ</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Dùng mật khẩu LOCAL_DEMO_PASSWORD trong file .env của bản thử nghiệm. Google/Clerk sẽ tích hợp ở giai đoạn P2.</p>
            <form onSubmit={login} className="mt-6 space-y-4">
              <label htmlFor="password" className="block text-sm font-semibold">Mật khẩu demo</label>
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-600" />
              <button disabled={Boolean(busy)} className="w-full rounded-xl bg-sky-700 px-5 py-3 font-semibold text-white hover:bg-sky-800 disabled:opacity-50">{busy ? "Đang xác thực..." : "Vào Studio →"}</button>
            </form>
          </section>
        ) : (
          <div className="grid gap-7 lg:grid-cols-[360px_1fr]">
            <section className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3"><div className="rounded-lg bg-sky-100 px-3 py-2 text-lg">↑</div><h2 className="text-lg font-bold">Tạo website mới</h2></div>
              <p className="mt-3 text-sm leading-6 text-slate-500">Chọn HTML đơn hoặc file ZIP. ZIP phải có index.html tại thư mục gốc.</p>
              <form onSubmit={createSite} className="mt-6 space-y-4">
                <div><label htmlFor="name" className="mb-2 block text-sm font-semibold">Tên hiển thị</label><input id="name" maxLength={100} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Landing page khách hàng" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-sky-600" /></div>
                <div><label htmlFor="new-upload" className="mb-2 block text-sm font-semibold">File HTML / ZIP</label><input id="new-upload" type="file" accept=".html,.htm,.zip" required onChange={(e) => setUpload(e.target.files?.[0] ?? null)} className="w-full rounded-xl border border-dashed border-sky-300 bg-sky-50 p-4 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-700 file:px-3 file:py-2 file:text-white" /></div>
                <p className="text-xs leading-5 text-slate-500">Tối đa 20 MiB ZIP nén · 100 MiB giải nén · 500 file. Không hỗ trợ SVG, PDF hay backend PHP.</p>
                <button disabled={Boolean(busy) || !upload} className="w-full rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:opacity-50">{busy === "upload" ? "Đang tải và xuất bản..." : "Xuất bản bản thử →"}</button>
              </form>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between"><div><h2 className="text-xl font-bold">Website của bạn</h2><p className="mt-1 text-sm text-slate-500">Tạo mới, cập nhật phiên bản hoặc tắt đường dẫn chia sẻ.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{sites.length} sites</span></div>
              {sites.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center"><div className="mb-3 text-4xl">▧</div><h3 className="font-semibold">Chưa có website nào</h3><p className="mt-2 text-sm text-slate-500">Bạn có thể thử file <code>examples/hello.html</code> trong repository.</p></div>
              ) : (
                <div className="space-y-4">
                  {sites.map((site) => (
                    <article key={site.id} className="rounded-xl border border-slate-200 p-5 transition hover:border-sky-200">
                      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-bold">{site.display_name}</h3><p className="mt-1 font-mono text-[11px] text-slate-400">{site.id}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${site.status === "published" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{site.status === "published" ? "● Đang chia sẻ" : "● Đã tắt"}</span></div>
                      <p className="mt-3 text-xs text-slate-500">Cập nhật: {new Date(site.updated_at).toLocaleString("vi-VN")}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {site.status === "published" && <a target="_blank" rel="noopener noreferrer" href={`/view/${site.id}`} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-800">Mở preview ↗</a>}
                        <button type="button" disabled={Boolean(busy)} onClick={() => toggleSite(site)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">{site.status === "published" ? "Tắt chia sẻ" : "Xuất bản lại"}</button>
                        <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50">Thay phiên bản
                          <input className="sr-only" type="file" accept=".html,.htm,.zip" disabled={Boolean(busy)} onChange={(e) => { void updateSite(site, e.target.files?.[0]); e.target.value = ""; }} />
                        </label>
                      </div>
                      {site.status === "published" && <p className="mt-3 break-all rounded-lg bg-slate-50 p-2 font-mono text-[11px] text-slate-500">{typeof window !== "undefined" ? window.location.origin : ""}/view/{site.id}</p>}
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
        <p className="mt-9 text-center text-xs text-slate-500">Local lab · Chưa có Google/Clerk và Cloudflare wildcard · Không mở stack này ra Internet</p>
      </div>
    </main>
  );
}
