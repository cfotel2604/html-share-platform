import { createHash } from "node:crypto";
import yauzl from "yauzl";

export type SiteAsset = { path: string; body: Buffer; type: string };

export const MAX_UPLOAD = 20 * 1024 * 1024;
const MAX_UNPACKED = 100 * 1024 * 1024;
const MAX_FILES = 500;
const MAX_ENTRIES = 1000;
const MAX_DEPTH = 12;
const ALLOWED = new Map([
  [".html", "text/html; charset=utf-8"], [".htm", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"], [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"], [".json", "application/json; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"], [".png", "image/png"],
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".gif", "image/gif"],
  [".webp", "image/webp"], [".ico", "image/x-icon"],
  [".woff", "font/woff"], [".woff2", "font/woff2"],
  [".ttf", "font/ttf"], [".otf", "font/otf"],
]);

export function assetType(path: string) {
  const extension = /\.[^.\/]+$/.exec(path)?.[0]?.toLowerCase();
  const type = extension && ALLOWED.get(extension);
  if (!type) throw new Error(`Định dạng không được hỗ trợ: ${path}`);
  return type;
}

export function safePath(path: string) {
  if (!path || path.length > 255 || /[\\\x00-\x1f\x7f?#%]/.test(path) ||
      path.startsWith("/") || /^[a-z]:/i.test(path)) {
    throw new Error("Đường dẫn ZIP không hợp lệ");
  }
  const parts = path.split("/");
  if (parts.length > MAX_DEPTH || parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("ZIP có đường dẫn không an toàn hoặc quá sâu");
  }
  return path;
}

export function fingerprint(assets: SiteAsset[]) {
  const hash = createHash("sha256");
  for (const asset of [...assets].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(asset.path).update("\0").update(createHash("sha256").update(asset.body).digest());
  }
  return hash.digest("hex");
}

export async function parseSite(file: File): Promise<SiteAsset[]> {
  if (file.size === 0 || file.size > MAX_UPLOAD) throw new Error("File vượt 20 MiB hoặc rỗng");
  const body = Buffer.from(await file.arrayBuffer());
  if (/\.html?$/i.test(file.name)) {
    return [{ path: "index.html", body, type: "text/html; charset=utf-8" }];
  }
  if (!/\.zip$/i.test(file.name)) throw new Error("Chỉ nhận .html hoặc .zip");
  return unzip(body);
}

export function unzip(data: Buffer): Promise<SiteAsset[]> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(data, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip) return reject(new Error("ZIP không hợp lệ"));
      const files: SiteAsset[] = [];
      const names = new Set<string>();
      const directories = new Set<string>();
      const explicitDirectories = new Set<string>();
      let entries = 0;
      let total = 0;
      let ended = false;
      function fail(error: Error) {
        if (ended) return;
        ended = true;
        zip!.close();
        reject(error);
      }
      zip.on("error", fail);
      zip.on("end", () => {
        if (ended) return;
        ended = true;
        if (!files.some((item) => item.path === "index.html")) {
          reject(new Error("ZIP phải chứa index.html ở thư mục gốc"));
        } else {
          resolve(files);
        }
      });
      zip.on("entry", (entry) => {
        try {
          if (++entries > MAX_ENTRIES) throw new Error("ZIP vượt 1000 entries");
          if (entry.generalPurposeBitFlag & 0x41) throw new Error("ZIP mã hóa không được hỗ trợ");
          const name = entry.fileName;
          const directory = name.endsWith("/");
          const path = safePath(directory ? name.slice(0, -1) : name);
          const canonical = path.toLowerCase();
          const unixMode = (entry.externalFileAttributes >>> 16) & 0o170000;
          if (unixMode && unixMode !== (directory ? 0o040000 : 0o100000)) {
            throw new Error("ZIP chứa symlink/file đặc biệt");
          }
          if (names.has(canonical) || (directory ? explicitDirectories.has(canonical) : directories.has(canonical))) {
            throw new Error("ZIP chứa đường dẫn trùng hoặc xung đột file/thư mục");
          }
          const parts = canonical.split("/");
          for (let index = 1; index < parts.length; index++) {
            const parent = parts.slice(0, index).join("/");
            if (names.has(parent)) throw new Error("ZIP có xung đột file/thư mục");
            directories.add(parent);
          }
          if (directory) {
            if (entry.uncompressedSize) throw new Error("ZIP có thư mục chứa dữ liệu");
            directories.add(canonical);
            explicitDirectories.add(canonical);
            zip.readEntry();
            return;
          }
          names.add(canonical);
          if (names.size > MAX_FILES) throw new Error("ZIP vượt 500 file");
          total += entry.uncompressedSize;
          if (total > MAX_UNPACKED) throw new Error("ZIP vượt 100 MiB giải nén");
          const type = assetType(path);
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) return fail(new Error("Không đọc được file trong ZIP"));
            const chunks: Buffer[] = [];
            let count = 0;
            stream.on("data", (chunk: Buffer) => {
              count += chunk.length;
              if (count > entry.uncompressedSize || count > MAX_UNPACKED) {
                stream.destroy(new Error("ZIP có kích thước không đúng"));
              } else {
                chunks.push(chunk);
              }
            });
            stream.on("error", fail);
            stream.on("end", () => {
              if (ended) return;
              files.push({ path, body: Buffer.concat(chunks), type });
              zip.readEntry();
            });
          });
        } catch (error) {
          fail(error instanceof Error ? error : new Error("ZIP không hợp lệ"));
        }
      });
      zip.readEntry();
    });
  });
}
