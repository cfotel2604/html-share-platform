import assert from "node:assert/strict";
import { test } from "node:test";
import { tsLoader } from "./helpers/load-ts.mjs";

const { readUpload, MAX_UPLOAD_BODY } = tsLoader()(new URL("../src/lib/upload-request.ts", import.meta.url));
function request(body, headers = {}) {
  return new Request("http://studio.test/api/sites", { method: "POST", body, headers, duplex: "half" });
}
function multipart() {
  const form = new FormData(); form.set("name", "Fixture");
  form.set("file", new File(["<!doctype html><p>fixture</p>"], "sample.html"));
  return form;
}
const status = (expected) => (error) => error.status === expected;

test("reads a legitimate multipart upload without Content-Length", async () => {
  const parsed = await readUpload(request(multipart()));
  assert.equal(parsed.name, "Fixture"); assert.equal(parsed.upload.name, "sample.html");
});

for (const length of [undefined, "1"]) {
  test(`caps streamed body before consuming the full upload, length=${length}`, async () => {
    let pulled = 0, cancelled = false;
    const body = new ReadableStream({
      pull(controller) {
        pulled++;
        controller.enqueue(Buffer.alloc(1024 * 1024, 97));
        if (pulled === 100) controller.close();
      },
      cancel() { cancelled = true; },
    }, { highWaterMark: 0 });
    const headers = { "Content-Type": "multipart/form-data; boundary=probe" };
    if (length !== undefined) headers["Content-Length"] = length;
    await assert.rejects(readUpload(request(body, headers)), status(413));
    assert.equal(pulled, MAX_UPLOAD_BODY / (1024 * 1024) + 1);
    assert.equal(cancelled, true);
  });
}

test("counts large non-file fields rather than trusting File.size", async () => {
  const body = Buffer.concat([
    Buffer.from('--probe\r\nContent-Disposition: form-data; name="file"; filename="tiny.html"\r\nContent-Type: text/html\r\n\r\ntiny\r\n--probe\r\nContent-Disposition: form-data; name="padding"\r\n\r\n'),
    Buffer.alloc(MAX_UPLOAD_BODY, 97), Buffer.from('\r\n--probe--\r\n'),
  ]);
  await assert.rejects(readUpload(request(body, { "Content-Type": "multipart/form-data; boundary=probe" })), status(413));
});

test("rejects declared oversize without pulling and cancels the source", async () => {
  let pulls = 0, cancelled = false;
  const body = new ReadableStream({ pull() { pulls++; }, cancel() { cancelled = true; } }, { highWaterMark: 0 });
  await assert.rejects(readUpload(request(body, { "Content-Length": String(MAX_UPLOAD_BODY + 1) })), status(413));
  assert.equal(pulls, 0); assert.equal(cancelled, true);
});

test("rejects malformed, duplicate and unexpected multipart fields", async () => {
  for (const field of ["file", "name"]) {
    const form = multipart();
    form.append(field, field === "file" ? new File(["bad"], "second.html") : "duplicate");
    await assert.rejects(readUpload(request(form)), status(400));
  }
  const extra = multipart(); extra.set("padding", "unexpected");
  await assert.rejects(readUpload(request(extra)), status(400));
  await assert.rejects(readUpload(request("bad", { "Content-Type": "multipart/form-data; boundary=x" })), status(400));
  await assert.rejects(readUpload(request("bad", { "Content-Length": "-1" })), status(400));
});

test("interrupted streams fail without exposing the source error", async () => {
  const body = new ReadableStream({ pull(controller) { controller.error(new Error("sensitive fixture error")); } });
  await assert.rejects(readUpload(request(body, { "Content-Type": "multipart/form-data; boundary=x" })),
    (error) => error.status === 400 && !error.message.includes("sensitive"));
});
