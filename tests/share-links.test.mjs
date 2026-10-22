import assert from "node:assert/strict";
import { test } from "node:test";
import { createShareCode, allocateShareCode } from "../scripts/share-codes.mjs";
import { tsLoader } from "./helpers/load-ts.mjs";

test("CSPRNG codes have the exact public format; allocation retries reserved codes", async () => {
  for (let i = 0; i < 100; i++) assert.match(createShareCode(), /^[A-Za-z0-9]{10}$/);
  const reserved = "bad", codes = ["OldCode123", "NewCode456"], calls = [];
  await assert.rejects(allocateShareCode({ query: () => assert.fail("Invalid generator reached DB") }, "site", () => reserved), /Invalid generated/);
  const code = await allocateShareCode({ query: async (_sql, values) => {
    calls.push(values); return { rowCount: values[0] === "OldCode123" ? 0 : 1 };
  } }, "stable-host-id", () => codes.shift());
  assert.equal(code, "NewCode456");
  assert.deepEqual(calls, [["OldCode123", "stable-host-id"], ["NewCode456", "stable-host-id"]]);
  let attempts = 0;
  await assert.rejects(allocateShareCode({ query: async () => { attempts++; return { rowCount: 0 }; } }, "site", () => "OldCode123"), /exhausted/);
  assert.equal(attempts, 10);
});

test("canonical viewer links use only short codes and never fall back to host IDs", t => {
  const prior = process.env.VIEWER_PUBLIC_ORIGIN;
  t.after(() => { if (prior === undefined) delete process.env.VIEWER_PUBLIC_ORIGIN; else process.env.VIEWER_PUBLIC_ORIGIN = prior; });
  const { shareUrl } = tsLoader()(new URL("../src/lib/public-url.ts", import.meta.url));
  delete process.env.VIEWER_PUBLIC_ORIGIN;
  assert.equal(shareUrl("AbC123xYz9"), "/view/AbC123xYz9");
  assert.equal(shareUrl(null), null);
  assert.throws(() => shareUrl("a".repeat(32)), /Invalid viewer/);
  process.env.VIEWER_PUBLIC_ORIGIN = "https://view-lab.ods.vn";
  assert.equal(shareUrl("AbC123xYz9"), "https://view-lab.ods.vn/AbC123xYz9");
});

test("invalid viewer aliases are rejected without a database lookup", async () => {
  const { resolveViewerSite } = tsLoader({ "./db": { db: () => assert.fail("Invalid alias reached DB") } })(new URL("../src/lib/share-links.ts", import.meta.url));
  for (const code of ["a".repeat(32), "", "short", "a".repeat(11), "ABC123_/..", "áBC123xYz9"])
    assert.equal(await resolveViewerSite(code), null);
});

test("viewer request budget returns a retry interval and recovers next window", () => {
  const { createViewerLimiter } = tsLoader()(new URL("../src/lib/viewer-limit.ts", import.meta.url));
  let time = 0;
  const check = createViewerLimiter(2, 60_000, () => time);
  assert.equal(check(), 0); assert.equal(check(), 0); assert.equal(check(), 60);
  time = 59_500; assert.equal(check(), 1);
  time = 60_000; assert.equal(check(), 0);
});

test("share API rejects guest, CSRF and invalid ID before any share mutation", async t => {
  const prior = process.env.SHARE_LINK_MUTATIONS_ENABLED;
  delete process.env.SHARE_LINK_MUTATIONS_ENABLED;
  t.after(() => { if(prior===undefined) delete process.env.SHARE_LINK_MUTATIONS_ENABLED; else process.env.SHARE_LINK_MUTATIONS_ENABLED=prior; });
  let calls = 0, allowed = true, signedIn = true;
  let denied;
  const load = tsLoader({
    "@/lib/auth": { sameOrigin: () => allowed, requireActor: async () => { if (!signedIn) throw denied; return { id: "actor" }; } },
    "@/lib/share-links": { changeShareLink: async (_actor, id, action) => { calls++; return { id, action }; } },
  });
  const route = load(new URL("../src/app/api/sites/[id]/share/route.ts", import.meta.url));
  denied = new (load(new URL("../src/lib/auth-policy.ts", import.meta.url)).AuthError)(401);
  const context = id => ({ params: Promise.resolve({ id }) });
  const request = new Request("http://127.0.0.1:3100/api/sites/example/share");
  allowed = false; assert.equal((await route.POST(request, context("a".repeat(32)))).status, 403);
  allowed = true; signedIn = false; assert.equal((await route.DELETE(request, context("a".repeat(32)))).status, 401);
  signedIn = true; assert.equal((await route.POST(request, context("invalid"))).status, 400);
  assert.equal(calls, 0);
  assert.equal((await route.POST(request, context("a".repeat(32)))).status, 200);
  assert.equal((await route.DELETE(request, context("a".repeat(32)))).headers.get("cache-control"), "no-store");
  const before = calls;
  process.env.SHARE_LINK_MUTATIONS_ENABLED = "false";
  assert.equal((await route.POST(request, context("a".repeat(32)))).status, 503);
  assert.equal(calls, before);
});
