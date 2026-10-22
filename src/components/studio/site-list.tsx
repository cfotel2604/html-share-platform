"use client";
import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Copy,
  FileCode2,
  Files,
  RefreshCw,
  Upload,
} from "lucide-react";
import type { SiteSummary } from "@/features/studio/types";
type Filter = "all" | "published" | "unpublished";
type Actions = {
  onUpdate: (site: SiteSummary, file: File) => Promise<boolean>;
  onToggle: (site: SiteSummary) => Promise<boolean>;
};
function SiteRow({
  site,
  busy,
  onUpdate,
  onToggle,
}: Actions & { site: SiteSummary; busy: boolean }) {
  const updateInput = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const published = site.status === "published";
  const preview = site.share_url ?? `/view/${site.id}`;
  async function copy() {
    setCopyError(false);
    setCopied(false);
    try {
      await navigator.clipboard.writeText(
        new URL(preview, window.location.origin).href,
      );
      setCopied(true);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <article className="studio-site" aria-label={site.display_name}>
      <div className="studio-site-icon">
        <FileCode2 size={21} aria-hidden="true" />
      </div>
      <div className="studio-site-content">
        <div className="studio-site-heading">
          <h3>{site.display_name}</h3>
          <span className={`studio-status ${published ? "is-published" : ""}`}>
            <span />
            {published
              ? "Đang chia sẻ"
              : site.status === "draft"
                ? "Bản nháp"
                : "Đã tắt"}
          </span>
        </div>
        <p className="studio-site-meta">
          <time dateTime={site.updated_at}>
            Cập nhật{" "}
            {new Date(site.updated_at).toLocaleString("vi-VN", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </time>
          <span className="studio-meta-separator">·</span>
          <span title={site.id}>{site.id.slice(0, 8)}</span>
        </p>
        <div className="studio-site-actions">
          {!published && (
            <a className="studio-button" href={`/preview/${site.id}`} target="_blank" rel="noopener noreferrer">
              Xem riêng <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          {published && (
            <>
              <a
                className="studio-button"
                href={preview}
                target="_blank"
                rel="noopener noreferrer"
              >
                Mở preview
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <button className="studio-button" type="button" onClick={copy}>
                {copied ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <Copy size={14} aria-hidden="true" />
                )}
                {copied ? "Đã sao chép" : "Sao chép link"}
              </button>
            </>
          )}
          <button
            className="studio-button studio-quiet"
            type="button"
            disabled={busy}
            onClick={() => updateInput.current?.click()}
          >
            <Upload size={14} aria-hidden="true" />
            Thay phiên bản
          </button>
          <input
            hidden
            ref={updateInput}
            type="file"
            accept=".html,.htm,.zip"
            aria-label={`Thay phiên bản ${site.display_name}`}
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onUpdate(site, file);
              event.target.value = "";
            }}
          />
          <button
            className="studio-button studio-quiet"
            type="button"
            disabled={busy}
            onClick={() => {
              void onToggle(site);
            }}
          >
            {published ? "Tắt chia sẻ" : "Xuất bản lại"}
          </button>
        </div>
        <span className="studio-sr-only" role="status">
          {copied ? `Đã sao chép link của ${site.display_name}.` : ""}
        </span>
        {copyError && (
          <p className="studio-copy-fallback" role="alert">
            Không thể sao chép tự động. Bạn có thể sao chép đường dẫn này:{" "}
            <input
              className="studio-input"
              aria-label="Link chia sẻ"
              readOnly
              value={
                typeof window === "undefined"
                  ? preview
                  : new URL(preview, window.location.origin).href
              }
              onFocus={(event) => event.target.select()}
            />
          </p>
        )}
      </div>
    </article>
  );
}
export function SiteList({
  sites,
  busy,
  onRefresh,
  onUpdate,
  onToggle,
}: Actions & {
  sites: SiteSummary[];
  busy: string;
  onRefresh: () => Promise<boolean>;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const filtered = sites.filter(
    (site) =>
      filter === "all" ||
      (filter === "published"
        ? site.status === "published"
        : site.status !== "published"),
  );
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "published", label: "Đang chia sẻ" },
    { value: "unpublished", label: "Đã tắt" },
  ];
  return (
    <section
      className="studio-site-list"
      aria-labelledby="sites-title"
      aria-busy={Boolean(busy)}
    >
      <div className="studio-list-heading">
        <div>
          <h2 id="sites-title">Website của bạn</h2>
          <p className="studio-description">
            Nội dung mới, cùng một đường link.
          </p>
        </div>
        <div className="studio-list-tools">
          <span className="studio-eyebrow">{sites.length} website</span>
          <button
            className="studio-button studio-icon-button"
            type="button"
            aria-label="Làm mới danh sách"
            disabled={Boolean(busy)}
            onClick={() => {
              void onRefresh();
            }}
          >
            <RefreshCw
              size={15}
              className={busy === "refresh" ? "studio-spin" : ""}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
      <div className="studio-filters" aria-label="Lọc website theo trạng thái">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
            <span>
              {item.value === "all"
                ? sites.length
                : sites.filter((site) =>
                    item.value === "published"
                      ? site.status === "published"
                      : site.status !== "published",
                  ).length}
            </span>
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="studio-empty">
          <Files size={28} strokeWidth={1.4} aria-hidden="true" />
          <h3>
            {sites.length === 0
              ? "Website đầu tiên bắt đầu từ đây."
              : "Chưa có website ở trạng thái này."}
          </h3>
          <p>
            {sites.length === 0
              ? "Chọn HTML hoặc ZIP ở phần Tạo website để nhận link chia sẻ."
              : "Thử bộ lọc khác để xem các website của bạn."}
          </p>
          {sites.length > 0 && (
            <button
              className="studio-button"
              type="button"
              onClick={() => setFilter("all")}
            >
              Xem tất cả
            </button>
          )}
        </div>
      ) : (
        <div className="studio-sites">
          {filtered.map((site) => (
            <SiteRow
              key={site.id}
              site={site}
              busy={Boolean(busy)}
              onUpdate={onUpdate}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </section>
  );
}
