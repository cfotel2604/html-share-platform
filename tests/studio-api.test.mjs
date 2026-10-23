import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Compile the real browser adapter, rather than duplicating its implementation.
const source = readFileSync(
  new URL("../src/features/studio/api.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const exports = {};
new Function("exports", compiled)(exports);
const { createStudioApi, StudioApiError } = exports;
const reply = (data, status = 200) => Response.json(data, { status });

test("workspace bootstrap uses one same-origin no-store request for auth and sites", async () => {
  const calls=[];
  const workspace={auth:{signedIn:true,demoAvailable:false,provider:'clerk',role:'employee'},sites:[]};
  const api=createStudioApi(async(url,init)=>{calls.push([url,init]);return reply(workspace);});
  assert.deepEqual(await api.workspace(),workspace);
  assert.equal(calls.length,1);
  assert.equal(calls[0][0],'/api/workspace');
  assert.equal(calls[0][1].credentials,'same-origin');
  assert.equal(calls[0][1].cache,'no-store');
});

test("auth and site queries use the existing endpoints and same-origin session", async () => {
  const calls = [];
  const site = {
    id: "a".repeat(32),
    display_name: "Example",
    status: "published",
    updated_at: "2026-10-08T12:00:00Z",
  };
  const api = createStudioApi(async (url, init) => {
    calls.push([url, init]);
    return reply(
      url.endsWith("auth")
        ? { signedIn: true, demoAvailable: true }
        : { sites: [site] },
    );
  });
  assert.equal((await api.auth()).signedIn, true);
  assert.deepEqual(await api.listSites(), [site]);
  assert.deepEqual(
    calls.map(([url]) => url),
    ["/api/auth", "/api/sites"],
  );
  for (const [, init] of calls) {
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.cache, "no-store");
  }
});

test("login/logout preserve JSON and HTTP method contracts", async () => {
  const calls = [];
  const api = createStudioApi(async (url, init) => {
    calls.push([url, init]);
    return reply({});
  });
  await api.login("test-fixture-password");
  await api.logout();
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    password: "test-fixture-password",
  });
  assert.equal(calls[0][1].headers["Content-Type"], "application/json");
  assert.equal(calls[1][1].method, "DELETE");
});

test("HTML/ZIP create and update use multipart without overriding its boundary", async () => {
  const calls = [];
  const result = { id: "a".repeat(32), fileCount: 1 };
  const api = createStudioApi(async (url, init) => {
    calls.push([url, init]);
    return reply(result);
  });
  const file = new File(["<!doctype html>"], "example.html", {
    type: "text/html",
  });
  assert.deepEqual(await api.createSite(file, "Example"), result);
  await api.updateSite("a/b", file, "Updated");
  assert.equal(calls[0][1].method, "POST");
  assert.equal(calls[1][1].method, "PUT");
  assert.equal(calls[1][0], "/api/sites/a%2Fb");
  for (const [, init] of calls) {
    assert.ok(init.body instanceof FormData);
    assert.equal(init.body.get("file").name, "example.html");
    assert.equal(init.headers, undefined);
  }
  assert.equal(calls[1][1].body.get("name"), "Updated");
});

test("publish sends a boolean and surfaces server authorization errors", async () => {
  const api = createStudioApi(async (url, init) => {
    assert.equal(url, "/api/sites/example");
    assert.equal(init.method, "PATCH");
    assert.deepEqual(JSON.parse(init.body), { published: false });
    return reply({ error: "Cần đăng nhập" }, 401);
  });
  await assert.rejects(api.setPublished("example", false), (error) => {
    assert.ok(error instanceof StudioApiError);
    assert.equal(error.status, 401);
    assert.equal(error.message, "Cần đăng nhập");
    return true;
  });
});

test("a non-JSON server failure has a readable error instead of a parser crash", async () => {
  const api = createStudioApi(
    async () => new Response("unavailable", { status: 503 }),
  );
  await assert.rejects(
    api.listSites(),
    (error) =>
      error instanceof StudioApiError &&
      error.status === 503 &&
      /không hợp lệ/.test(error.message),
  );
});

test("share actions use same-origin session and server canonical URL", async () => {
  const calls = [], result = { id: "site", share_code: "AbC123xYz9", share_url: "https://view-lab.ods.vn/AbC123xYz9" };
  const api = createStudioApi(async (url, init) => { calls.push([url,init]); return reply(result); });
  assert.deepEqual(await api.rotateShare("a/b"), result);
  await api.revokeShare("a/b");
  assert.deepEqual(calls.map(([url,init])=>[url,init.method,init.credentials]), [
    ["/api/sites/a%2Fb/share","POST","same-origin"], ["/api/sites/a%2Fb/share","DELETE","same-origin"],
  ]);
});
