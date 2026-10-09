import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const web = `http://127.0.0.1:${process.env.APP_PORT ?? 3100}`;
const gateway = `http://127.0.0.1:${process.env.GATEWAY_PORT ?? 4100}`;
const password = process.env.LOCAL_DEMO_PASSWORD;
assert.ok(password, "Set LOCAL_DEMO_PASSWORD in .env");

async function expectStatus(response, expected) {
  assert.equal(response.status, expected, `expected ${expected}, got ${response.status}`);
  return response;
}

const unauth = await fetch(`${web}/api/sites`);
await expectStatus(unauth, 401);

await expectStatus(await fetch(`${web}/api/auth`, {
  method: "POST", headers: { Origin: "http://other.example", "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
}), 403);

const login = await expectStatus(await fetch(`${web}/api/auth`, {
  method: "POST", headers: { Origin: web, "Content-Type": "application/json" },
  body: JSON.stringify({ password }),
}), 200);
const cookie = login.headers.get("set-cookie")?.split(";")[0];
assert.ok(cookie, "Expected session cookie");
const headers = { Cookie: cookie, Origin: web };
await expectStatus(await fetch(`${web}/api/sites`, { headers }), 200);

const form = new FormData();
form.set("name", "MVP smoke demo");
form.set("file", new File([await readFile("examples/hello.html")], "hello.html", { type: "text/html" }));
const createdResponse = await expectStatus(await fetch(`${web}/api/sites`, {
  method: "POST", headers, body: form,
}), 201);
const { id } = await createdResponse.json();
assert.match(id, /^[a-f0-9]{32}$/);

async function viewerUrl(siteId) {
  const { sites } = await (await expectStatus(await fetch(`${web}/api/sites`, { headers }), 200)).json();
  const site = sites.find(item => item.id === siteId);
  assert.ok(site?.share_url);
  return new URL(site.share_url, web).href;
}
const preview = await viewerUrl(id);
const asset = `${gateway}/s/${id}/`;
await expectStatus(await fetch(preview), 200);
const firstAsset = await expectStatus(await fetch(asset), 200);
assert.match(await firstAsset.text(), /ODS|HTML|hello/i);
assert.match(firstAsset.headers.get("content-security-policy") ?? "", /sandbox allow-scripts/);
assert.match(firstAsset.headers.get("content-security-policy") ?? "", new RegExp(web.replaceAll(".", "\\.")));
await expectStatus(await fetch(asset, { method: "HEAD" }), 200);

const update = new FormData();
update.set("name", "MVP smoke demo v2");
update.set("file", new File(["<!doctype html><title>Updated preview</title><p>Version two</p>"], "updated.html"));
await expectStatus(await fetch(`${web}/api/sites/${id}`, { method: "PUT", headers, body: update }), 200);
const changed = await expectStatus(await fetch(asset), 200);
assert.match(await changed.text(), /Version two/);

await expectStatus(await fetch(`${web}/api/sites/${id}`, {
  method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ published: false }),
}), 200);
await expectStatus(await fetch(asset), 404);
await expectStatus(await fetch(preview), 404);

await expectStatus(await fetch(`${web}/api/sites/${id}`, {
  method: "PATCH", headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ published: true }),
}), 200);
await expectStatus(await fetch(asset), 200);

const sites = await (await expectStatus(await fetch(`${web}/api/sites`, { headers }), 200)).json();
assert.ok(sites.sites.some((site) => site.id === id && site.status === "published"));
await expectStatus(await fetch(`${web}/api/sites`, {
  method: "POST", headers: { Cookie: cookie, Origin: "http://invalid.test" }, body: form,
}), 403);

const zipPath = process.argv[2];
if (zipPath) {
  const zipped = new FormData();
  zipped.set("name", "MVP ZIP demo");
  zipped.set("file", new File([await readFile(zipPath)], "sample.zip", { type: "application/zip" }));
  const response = await expectStatus(await fetch(`${web}/api/sites`, {
    method: "POST", headers, body: zipped,
  }), 201);
  const { id: zipId, fileCount } = await response.json();
  assert.equal(fileCount, 2);
  const zipHtml = await expectStatus(await fetch(`${gateway}/s/${zipId}/`), 200);
  assert.match(await zipHtml.text(), /ZIP sample/);
  const zipCss = await expectStatus(await fetch(`${gateway}/s/${zipId}/style.css`), 200);
  assert.match(await zipCss.text(), /font-weight/);
  console.log(`Published ZIP sample: ${await viewerUrl(zipId)}`);
}

console.log(`PASS: auth, CSRF, upload, version, preview CSP, unpublish/republish`);
console.log(`Studio: ${web}`);
console.log(`Published sample: ${preview}`);
console.log(`Isolated HTML: ${asset}`);
