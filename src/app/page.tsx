export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">P1 · Foundation</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">HTML Share Platform</h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-600">
          Ứng dụng đang ở giai đoạn xây dựng nền tảng. Chức năng đăng nhập, upload và
          xuất bản trang sẽ được phát triển và kiểm thử ở các phase tiếp theo.
        </p>
        <p className="mt-8 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
          Môi trường development: chưa cung cấp chức năng quản trị hoặc public serving.
        </p>
      </section>
    </main>
  );
}
