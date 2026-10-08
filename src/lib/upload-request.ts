import { UploadError } from "./upload-error";

// File quota is 20 MiB; the separate body cap includes all multipart overhead/fields.
export const MAX_UPLOAD_BODY = 22 * 1024 * 1024;

export async function readUpload(request: Request) {
  const declared = request.headers.get("content-length");
  const type = request.headers.get("content-type") ?? "";
  async function reject(error: UploadError): Promise<never> {
    await request.body?.cancel().catch(() => {});
    throw error;
  }
  if (declared !== null && !/^\d+$/.test(declared)) {
    return reject(new UploadError("Content-Length không hợp lệ", 400));
  }
  if (declared !== null && Number(declared) > MAX_UPLOAD_BODY) {
    return reject(new UploadError("Body upload vượt 22 MiB (file tối đa 20 MiB)", 413));
  }
  if (!/^multipart\/form-data\s*;/i.test(type) || !request.body) {
    return reject(new UploadError("Cần gửi tên và file HTML/ZIP bằng multipart", 400));
  }

  const reader = request.body.getReader();
  let count = 0;
  let failure: UploadError | undefined;
  let controller: ReadableStreamDefaultController<Uint8Array>;
  const abort = () => {
    failure = new UploadError("Upload đã bị gián đoạn", 400);
    controller.error(failure);
    void reader.cancel().catch(() => {});
  };
  const limited = new ReadableStream<Uint8Array>({
    start(value) { controller = value; },
    async pull(value) {
      try {
        const chunk = await reader.read();
        if (chunk.done) { value.close(); return; }
        count += chunk.value.byteLength;
        if (count > MAX_UPLOAD_BODY) {
          failure = new UploadError("Body upload vượt 22 MiB (file tối đa 20 MiB)", 413);
          value.error(failure);
          await reader.cancel().catch(() => {});
        } else {
          value.enqueue(chunk.value);
        }
      } catch {
        failure ??= new UploadError("Upload đã bị gián đoạn", 400);
        value.error(failure);
      }
    },
    cancel(reason) { return reader.cancel(reason); },
  }, { highWaterMark: 0 });

  request.signal.addEventListener("abort", abort, { once: true });
  try {
    if (request.signal.aborted) abort();
    // The parser can only consume bytes through the counter, never the original body.
    const form = await new Response(limited, { headers: { "Content-Type": type } }).formData();
    const upload = form.get("file");
    const name = form.get("name");
    if (!(upload instanceof File) || typeof name !== "string" ||
        form.getAll("file").length !== 1 || form.getAll("name").length !== 1 ||
        [...form.keys()].some((key) => key !== "file" && key !== "name")) {
      throw new UploadError("Cần đúng một tên và một file HTML/ZIP", 400);
    }
    return { upload, name };
  } catch (error) {
    throw failure ?? (error instanceof UploadError ? error : new UploadError("Multipart upload không hợp lệ", 400));
  } finally {
    request.signal.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
