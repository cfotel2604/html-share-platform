import assert from "node:assert/strict";
import { test } from "node:test";
import { mapRequest } from "../scripts/gateway.mjs";

const id = "a".repeat(32);

test("maps only allowed published-site asset paths", () => {
  assert.deepEqual(mapRequest(`/s/${id}/`), { id, asset: "index.html", type: "text/html; charset=utf-8" });
  assert.deepEqual(mapRequest(`/s/${id}/css/main.css?v=1`), { id, asset: "css/main.css", type: "text/css; charset=utf-8" });
  assert.deepEqual(mapRequest(`/s/${id}/assets/logo.png`), { id, asset: "assets/logo.png", type: "image/png" });
});

test("rejects traversal, ambiguity and executable file types", () => {
  for (const path of [
    `/s/${id}/../index.html`, `/s/${id}/%2e%2e/index.html`, `/s/${id}/%2Fetc/passwd`,
    `/s/${id}/%5Csecret.html`, `/s/${id}/%252e%252e/test.html`,
    `/s/${id}/secret.svg`, `/s/${id}/test.php`, `/s/${id}/.env`,
    `/s/${id}/a//file.html`, `/s/${id}/test%3f.html`, `/s/${id}/test%23.html`,
    `/s/${"Z".repeat(32)}/index.html`,
  ]) {
    assert.equal(mapRequest(path), null, path);
  }
});
