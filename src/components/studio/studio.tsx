"use client";
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useStudio } from "@/features/studio/use-studio";
import { StudioHeader } from "./studio-header";
import { LoginPanel } from "./login-panel";
import { UploadPanel } from "./upload-panel";
import { SiteList } from "./site-list";
import Link from "next/link";
export function Studio() {
  const studio = useStudio();
  const signedIn = studio.session === "signed-in";
  return (
    <div className="studio-app">
      <a className="studio-skip-link" href="#studio-main">
        Đến nội dung chính
      </a>
      <StudioHeader
        signedIn={signedIn}
        busy={Boolean(studio.busy)}
        onLogout={() => {
          void studio.logout();
        }}
      />
      <main className="studio-main" id="studio-main">
        <div className="studio-intro">
          <p className="studio-eyebrow">Create. Publish. Share.</p>
          <h1>Từ ý tưởng đến đường link.</h1>
          <p>Một nơi cho các trang HTML bạn muốn chia sẻ.</p>
        </div>
        {studio.error && (
          <div className="studio-feedback studio-feedback-error" role="alert">
            <AlertCircle size={17} aria-hidden="true" />
            <span>{studio.error}</span>
          </div>
        )}
        {studio.notice && (
          <div
            className="studio-feedback studio-feedback-success"
            role="status"
          >
            <CheckCircle2 size={17} aria-hidden="true" />
            <span>{studio.notice}</span>
          </div>
        )}
        {studio.session === "checking" ? (
          <div className="studio-loading" role="status">
            <LoaderCircle
              size={20}
              className="studio-spin"
              aria-hidden="true"
            />
            Đang mở workspace…
          </div>
        ) : studio.session === "signed-out" ? (
          <LoginPanel busy={Boolean(studio.busy)} onLogin={studio.login} provider={studio.provider} />
        ) : studio.session === "unavailable" || studio.session === "error" ? (
          <section className="studio-connection-panel">
            <h2>
              {studio.session === "unavailable"
                ? "Workspace chưa sẵn sàng"
                : "Chưa thể mở workspace"}
            </h2>
            <p>
              Vui lòng thử lại hoặc liên hệ người quản lý môi trường thử nghiệm.
            </p>
            <button
              className="studio-button"
              type="button"
              onClick={studio.retry}
            >
              Thử lại
            </button>
            {studio.provider === "clerk" && <Link className="studio-button" href="/sign-out">Đăng xuất tài khoản hiện tại</Link>}
          </section>
        ) : (
          <div className="studio-workspace">
            <UploadPanel busy={Boolean(studio.busy)} onCreate={studio.create} />
            <SiteList
              sites={studio.sites}
              busy={studio.busy}
              onRefresh={studio.refresh}
              onUpdate={studio.update}
              onToggle={studio.toggle}
            />
          </div>
        )}
      </main>
      <footer className="studio-footer">
        <span>ODS HTML Studio</span>
        <span>
          <ShieldCheck size={13} aria-hidden="true" />
          Local lab · Link chỉ mở trên máy này
        </span>
      </footer>
    </div>
  );
}
