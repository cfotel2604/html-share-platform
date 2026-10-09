"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
export function LoginPanel({
  busy,
  onLogin,
  provider = "local-demo",
}: {
  busy: boolean;
  onLogin: (password: string) => Promise<boolean>;
  provider?: string;
}) {
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await onLogin(password)) setPassword("");
  }
  return (
    <section className="studio-login-panel" aria-labelledby="login-title">
      <div className="studio-panel-icon">
        <LockKeyhole size={21} aria-hidden="true" />
      </div>
      <p className="studio-eyebrow">Workspace access</p>
      <h2 id="login-title">Chào mừng đến Studio.</h2>
      <p className="studio-description">
        Đăng nhập để tạo website và quản lý các đường link của bạn.
      </p>
      {provider === "clerk" ? (
        <Link className="studio-button studio-primary studio-full-width" href="/sign-in">
          Đăng nhập bằng Google <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : <form onSubmit={submit}>
        <label className="studio-label" htmlFor="password">
          Mật khẩu workspace
        </label>
        <input
          className="studio-input"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
        />
        <button
          className="studio-button studio-primary studio-full-width"
          disabled={busy}
          type="submit"
        >
          {busy ? "Đang đăng nhập…" : "Vào Studio"}
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      </form>}
      <p className="studio-caption">Môi trường thử nghiệm nội bộ.</p>
    </section>
  );
}
