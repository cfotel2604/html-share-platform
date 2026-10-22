"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { LogOut, Moon, Sun } from "lucide-react";
const subscribe = () => () => {};
const readTheme = () => {
  try {
    return window.localStorage.getItem("ods-studio-theme") ?? "system";
  } catch {
    return "system";
  }
};

export function StudioHeader({
  signedIn,
  busy,
  onLogout,
}: {
  signedIn: boolean;
  busy: boolean;
  onLogout: () => void;
}) {
  const savedTheme = useSyncExternalStore(subscribe, readTheme, () => "system");
  const [selection, setSelection] = useState<string | null>(null);
  const theme = selection ?? savedTheme;
  useEffect(() => {
    document.documentElement.dataset.studioTheme = theme;
  }, [theme]);
  function toggleTheme() {
    const dark =
      theme === "dark" ||
      (theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    setSelection(next);
    try {
      window.localStorage.setItem("ods-studio-theme", next);
    } catch {
      /* Theme works without storage. */
    }
  }
  return (
    <header className="studio-header">
      <div className="studio-header-inner">
        <Link
          className="studio-brand"
          href="/"
          aria-label="ODS HTML Studio, trang chủ"
        >
          <span className="studio-wordmark">ODS</span>
          <span className="studio-brand-divider" />
          <span className="studio-brand-name">HTML Studio</span>
        </Link>
        <div className="studio-header-actions">
          <span className="studio-lab-label">
            <span />
            Local workspace
          </span>
          <button
            className="studio-button studio-icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label="Đổi giao diện sáng tối"
          >
            <Sun className="studio-sun" size={16} aria-hidden="true" />
            <Moon className="studio-moon" size={16} aria-hidden="true" />
          </button>
          {signedIn && (
            <button
              className="studio-button studio-quiet"
              type="button"
              onClick={onLogout}
              disabled={busy}
              aria-label="Đăng xuất"
            >
              <LogOut size={15} aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
