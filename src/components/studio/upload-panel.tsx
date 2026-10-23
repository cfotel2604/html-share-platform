"use client";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { FileArchive, FileCode2, Plus, Upload, X } from "lucide-react";
export function UploadPanel({
  busy,
  onCreate,
  pathBased=false,
}: {
  busy: boolean;
  onCreate: (file: File, name: string) => Promise<boolean>;
  pathBased?:boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  function choose(files: FileList | null) {
    setError("");
    const selected = files?.[0];
    if (!selected) return;
    if (files!.length !== 1 || !/\.(html?|zip)$/i.test(selected.name)) {
      setFile(null);
      setError("Vui lòng chọn một file HTML hoặc ZIP.");
      return;
    }
    if (selected.size === 0 || selected.size > 20 * 1024 * 1024) {
      setFile(null);
      setError("File phải có nội dung và không vượt quá 20 MiB.");
      return;
    }
    setFile(selected);
  }
  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!busy) choose(event.dataTransfer.files);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên website.");
      return;
    }
    if (!file) {
      setError("Hãy chọn file trước khi tạo website.");
      return;
    }
    if (await onCreate(file, name.trim())) {
      setName("");
      setFile(null);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <section className="studio-upload-panel" aria-labelledby="upload-title">
      <h2 id="upload-title">Tạo website</h2>
      <p className="studio-description">Bắt đầu với một file HTML hoặc ZIP.</p>
      {pathBased&&<p className="studio-caption">Chỉ trang tĩnh dùng đường dẫn tài nguyên tương đối. Không hỗ trợ cookie, localStorage, PWA hoặc SPA dùng router tại root.</p>}
      <form onSubmit={submit}>
        <label className="studio-label" htmlFor="name">
          Tên website
        </label>
        <input
          className="studio-input"
          id="name"
          maxLength={100}
          required
          disabled={busy}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ví dụ: Giới thiệu sản phẩm"
        />
        <label className="studio-label" htmlFor="new-upload">
          Nội dung
        </label>
        <div
          className={`studio-dropzone ${dragging ? "is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
        >
          {file ? (
            <>
              <div className="studio-file-selection">
                {/\.zip$/i.test(file.name) ? (
                  <FileArchive size={22} aria-hidden="true" />
                ) : (
                  <FileCode2 size={22} aria-hidden="true" />
                )}
                <span>{file.name}</span>
                <button
                  className="studio-button studio-icon-button"
                  type="button"
                  aria-label="Bỏ file đã chọn"
                  disabled={busy}
                  onClick={() => {
                    setFile(null);
                    if (input.current) input.current.value = "";
                  }}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
              <p className="studio-caption">
                {(file.size / 1024).toLocaleString("vi-VN", {
                  maximumFractionDigits: 1,
                })}{" "}
                KiB · Sẵn sàng tải lên
              </p>
            </>
          ) : (
            <>
              <Upload size={23} aria-hidden="true" />
              <p>Kéo file vào đây</p>
              <span className="studio-caption">hoặc chọn từ máy của bạn</span>
            </>
          )}
          <input
            ref={input}
            id="new-upload"
            type="file"
            accept=".html,.htm,.zip"
            disabled={busy}
            onChange={(event) => choose(event.target.files)}
            aria-describedby="upload-help"
          />
        </div>
        <p id="upload-help" className="studio-caption studio-upload-help">
          Tối đa 20 MiB · ZIP có <code>index.html</code> tại thư mục gốc.
        </p>
        {error && (
          <p className="studio-field-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="studio-button studio-primary studio-full-width"
          disabled={busy || !file}
          type="submit"
        >
          <Plus size={16} aria-hidden="true" />
          {busy ? "Đang xử lý…" : "Tạo và xuất bản"}
        </button>
      </form>
      <div className="studio-upload-note">
        <span className="studio-eyebrow">Một đường link, nhiều phiên bản</span>
        <p>Cập nhật nội dung bất cứ lúc nào mà vẫn giữ nguyên link chia sẻ.</p>
      </div>
    </section>
  );
}
