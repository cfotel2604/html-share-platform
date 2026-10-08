import assert from "node:assert/strict";
import { test } from "node:test";
import { tsLoader } from "./helpers/load-ts.mjs";
import { zipBytes, hostileZips } from "./helpers/zip.mjs";

const { parseSite, unzip } = tsLoader()(new URL("../src/lib/upload.ts", import.meta.url));
test("valid ZIP accepts assets and explicit directories after their children", async () => {
  const assets = await unzip(zipBytes([
    { name: "index.html", body: "<!doctype html><p>fixture</p>" },
    { name: "assets/style.css", body: "body{}" },
    { name: "assets/", body: "", mode: 0o040755 },
  ]));
  assert.deepEqual(assets.map(asset => asset.path), ["index.html", "assets/style.css"]);
});
for (const [label, bytes] of hostileZips()) {
  test(`rejects ZIP ${label}`, async () => { await assert.rejects(unzip(bytes)); });
}
test("rejects invalid archives and oversized or empty files", async () => {
  await assert.rejects(unzip(Buffer.from("not a zip")));
  await assert.rejects(parseSite(new File([], "empty.html")));
  await assert.rejects(parseSite(new File([Buffer.alloc(20 * 1024 * 1024 + 1)], "large.html")));
});
