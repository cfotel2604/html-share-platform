import assert from "node:assert/strict";
import { test } from "node:test";
import { tsLoader } from "./helpers/load-ts.mjs";

const url = "http://studio.test/api/sites/" + "a".repeat(32);
function fixture({ signedIn = true, origin = true, allowed = true } = {}) {
  const calls = [];
  let AuthError;
  const stubs = {
    "@/lib/auth": { sameOrigin: () => origin, requireActor: async () => { calls.push("auth"); if(!signedIn) throw new AuthError(401);return {id:"owner",role:"employee",mode:"clerk"}; } },
    "@/lib/db": { db: () => { throw new Error("unexpected DB access"); } },
  };
  const load = tsLoader(stubs);
  ({AuthError} = load(new URL("../src/lib/auth-policy.ts",import.meta.url)));
  const { UploadError } = load(new URL("../src/lib/upload-error.ts", import.meta.url));
  stubs["@/lib/site-ops"] = {
    assertSiteOwner: async () => { calls.push("ownership"); if (!allowed) throw new UploadError("not found", 404); },
    uploadVersion: async () => { calls.push("write"); throw new Error("private infrastructure detail"); },
  };
  const route = load(new URL("../src/app/api/sites/[id]/route.ts", import.meta.url));
  const create = load(new URL("../src/app/api/sites/route.ts", import.meta.url));
  return { ...route, POST: create.POST, calls };
}
function body() {
  const form = new FormData(); form.set("name", "Fixture"); form.set("file", new File(["fixture"], "test.html")); return form;
}
const context = { params: Promise.resolve({ id: "a".repeat(32) }) };
test("PUT rejects an inaccessible site before consuming the body", async () => {
  const f = fixture({ allowed: false }); let reads = 0;
  const stream = new ReadableStream({ pull() { reads++; } }, { highWaterMark: 0 });
  const result = await f.PUT(new Request(url, { method: "PUT", body: stream, duplex: "half" }), context);
  assert.equal(result.status, 404); assert.equal(reads, 0); assert.deepEqual(f.calls, ["auth", "ownership"]);
});
for (const [label, options, code] of [["guest", { signedIn: false }, 401], ["foreign Origin", { origin: false }, 403]]) {
  test(`${label} cannot reach upload parsing or storage`, async () => {
    const f = fixture(options);
    assert.equal((await f.PUT(new Request(url, { method: "PUT", body: body() }), context)).status, code);
    assert.equal((await f.POST(new Request(url, { method: "POST", body: body() }))).status, code);
    assert.ok(!f.calls.includes("write")); assert.ok(!f.calls.includes("ownership"));
  });
}
test("POST returns 413 for actual oversized body and 500 without leaking storage errors", async () => {
  const f = fixture();
  const result = await f.POST(new Request(url, { method: "POST", body: Buffer.alloc(23 * 1024 * 1024), headers: { "Content-Type": "multipart/form-data; boundary=x" } }));
  assert.equal(result.status, 413); assert.ok(!f.calls.includes("write"));
  const failure = await f.POST(new Request(url, { method: "POST", body: body() }));
  assert.equal(failure.status, 500); assert.ok(!JSON.stringify(await failure.json()).includes("private infrastructure"));
});
