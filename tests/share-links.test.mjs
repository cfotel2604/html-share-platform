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

test("canonical public links require an HTTPS Worker origin without Node fallback", t => {
  const keys=['PUBLIC_CONTENT_ORIGIN','AUTH_TRUSTED_ORIGINS'],prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  t.after(()=>{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}});
  const { shareUrl } = tsLoader()(new URL("../src/lib/public-url.ts", import.meta.url));
  delete process.env.PUBLIC_CONTENT_ORIGIN;
  assert.throws(()=>shareUrl('AbC123xYz9'),/PUBLIC_CONTENT_ORIGIN is required/);
  assert.equal(shareUrl(null), null);
  assert.throws(() => shareUrl("a".repeat(32)), /Invalid share/);
  process.env.PUBLIC_CONTENT_ORIGIN='https://content.example.test';
  assert.equal(shareUrl('AbC123xYz9'),'https://content.example.test/AbC123xYz9/');
});

test('public origin rejects HTTP, credentials, paths and shared registrable/private-suffix domains',t=>{
  const keys=['PUBLIC_CONTENT_ORIGIN','AUTH_TRUSTED_ORIGINS'],prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  t.after(()=>{for(const key of keys){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}});
  const {shareUrl}=tsLoader()(new URL('../src/lib/public-url.ts',import.meta.url));
  process.env.AUTH_TRUSTED_ORIGINS='https://studio.ods.test,https://studio.tenant.github.io';
  for(const origin of ['http://content.example.test','https://content.example.test/path','https://u:p@content.example.test','https://content.ods.test','https://files.tenant.github.io']){
    process.env.PUBLIC_CONTENT_ORIGIN=origin;assert.throws(()=>shareUrl('AbC123xYz9'),/Unsafe/);
  }
});

test('Node URL formatter cannot emit a public gateway URL without a preview grant',()=>{
  const {previewSiteUrl}=tsLoader()(new URL('../src/lib/public-url.ts',import.meta.url));
  assert.throws(()=>previewSiteUrl('a'.repeat(32)),/Invalid preview/);
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
