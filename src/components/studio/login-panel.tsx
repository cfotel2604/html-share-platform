"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
export function LoginPanel({
  busy,
  onLogin,
}: {
  busy: boolean;
  onLogin: (password: string) => Promise<boolean>;
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
      <form onSubmit={submit}>
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
      </form>
      <p className="studio-caption">Môi trường thử nghiệm nội bộ.</p>
    </section>
  );
}
