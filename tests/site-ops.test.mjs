import assert from "node:assert/strict";
import { test } from "node:test";
import { tsLoader } from "./helpers/load-ts.mjs";

const id = "a".repeat(32);
const actor = { id: "owner", role: "employee", mode: "clerk" };
function fixture({ authorized = true, failAt, rollbackFails = false, cleanupFailures = 0 } = {}) {
  const calls = [], removed = [];
  let cleanupAttempts = 0, released;
  const client = {
    async query(sql, values) {
      const step = sql.includes("FOR UPDATE") ? "ownership-lock"
        : sql.includes("INSERT INTO site_versions") ? "reserve"
        : sql.includes("UPDATE site_versions") ? "verify-manifest"
        : sql.includes("INSERT INTO sites") ? "create"
        : sql.includes("UPDATE sites") ? "activate"
        : sql.includes("INSERT INTO audit_events") ? "audit" : sql;
      calls.push(step);
      if (step === "ownership-lock") {
        assert.match(sql, /owner_id = \$2 OR \$3 = 'admin'/);
        assert.deepEqual(values, [id, "owner", "employee"]);
      }
      if (step === failAt || (step === "ROLLBACK" && rollbackFails)) throw new Error("fixture operation failed");
      return { rowCount: authorized ? 1 : 0 };
    },
    release(discard) { released = discard; calls.push("release"); },
  };
  let writes = 0;
  const confirmedKeys = [], unconfirmedKeys = [];
  const source = tsLoader({
    "./auth-policy": {lockActor: async (_client,current) => current},
    "./db": { db: () => ({
      connect: async () => client,
      query: async (sql, values) => {
        calls.push("preflight"); assert.match(sql, /owner_id = \$2 OR \$3 = 'admin'/);
        assert.deepEqual(values, [id, "owner", "employee"]); return { rowCount: authorized ? 1 : 0 };
      },
    }) },
    "./upload": {
      parseSite: async () => { calls.push("ingest"); return [
        { path: "index.html", body: Buffer.from("fixture"), type: "text/html" },
        { path: "style.css", body: Buffer.from("body{}"), type: "text/css" },
      ]; },
      fingerprint: () => "fixture-hash",
    },
    "./storage": {
      ensureBucket: async () => { calls.push("bucket"); },
      storeFile: async key => {
        calls.push("write");
        if (++writes === failAt) { unconfirmedKeys.push(key); throw new Error("fixture operation failed"); }
        confirmedKeys.push(key);
      },
      readbackFile: async () => { calls.push("readback"); if (failAt === "readback") throw new Error("fixture readback mismatch"); return "verified-etag"; },
      removeFiles: async keys => {
        calls.push("cleanup"); removed.push([...keys]);
        if (++cleanupAttempts <= cleanupFailures) throw new Error("fixture cleanup failed");
      },
    },
  })(new URL("../src/lib/site-ops.ts", import.meta.url));
  return { ...source, calls, removed, confirmedKeys, unconfirmedKeys, released: () => released };
}

for (const reason of ["unknown", "foreign-owner", "deleted"]) {
  test(`${reason} update cannot ingest or touch storage`, async () => {
    const f = fixture({ authorized: false });
    await assert.rejects(f.assertSiteOwner(actor, id), error => error.status === 404);
    await assert.rejects(f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id), error => error.status === 404);
    assert.deepEqual(f.calls, ["preflight", "BEGIN", "ownership-lock", "ROLLBACK", "release"]);
  });
}
test("locks ownership and reserves a unique version before every storage write", async () => {
  const f = fixture();
  assert.deepEqual(await f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id), { id, fileCount: 2 });
  assert.deepEqual(f.calls.slice(0,5), ["BEGIN", "ownership-lock", "ingest", "reserve", "bucket"]);
  assert.equal(f.calls.filter(x=>x==='write').length,2);
  assert.equal(f.calls.filter(x=>x==='readback').length,2);
  assert.deepEqual(f.calls.slice(-5), ["verify-manifest", "activate", "audit", "COMMIT", "release"]);
  assert.equal(f.released(), false);
});
test("a reserved-prefix collision never writes over existing objects", async () => {
  const f = fixture({ failAt: "reserve" });
  await assert.rejects(f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id));
  assert.ok(!f.calls.includes("bucket")); assert.equal(f.removed.length, 0);
});
for (const failAt of [2, "audit"]) {
  test(`failure ${failAt} rolls back and deletes only confirmed new keys`, async () => {
    const f = fixture({ failAt });
    await assert.rejects(f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id), /fixture operation failed/);
    assert.ok(f.calls.indexOf("ROLLBACK") < f.calls.indexOf("cleanup"));
    assert.equal(f.removed[0].length, failAt === 2 ? 1 : 2);
    for (const key of f.removed[0]) {
      assert.match(key, new RegExp(`^${id}/[a-f0-9-]{36}/(index.html|style.css)$`));
      assert.ok(!key.includes("previous-version"));
    }
  });
}

test("readback mismatch rolls back before activation and cleans all confirmed peer objects", async () => {
  const f = fixture({ failAt: "readback" });
  await assert.rejects(f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id), /readback mismatch/);
  assert.deepEqual(new Set(f.removed[0]),new Set(f.confirmedKeys));
  assert.ok(!f.calls.includes("activate"));
  assert.ok(!f.calls.includes("COMMIT"));
});

test("a failed first conditional PUT never deletes a possibly pre-existing key", async () => {
  const f = fixture({ failAt: 1 });
  await assert.rejects(f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id));
  assert.equal(f.unconfirmedKeys.length,1);
  assert.deepEqual(new Set(f.removed.flat()),new Set(f.confirmedKeys));
  assert.ok(!f.removed.flat().includes(f.unconfirmedKeys[0]));
  assert.ok(!f.calls.includes("activate"));
});
test("cleanup retries idempotent deletes and preserves the original failure", async () => {
  const f = fixture({ failAt: "audit", cleanupFailures: 2 });
  await assert.rejects(f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id), /fixture operation failed/);
  assert.equal(f.removed.length, 3); assert.deepEqual(f.removed[0], f.removed[2]);
});
test("persistent cleanup failure emits a bounded recovery event with no uploaded data", async t => {
  const warn = t.mock.method(console, "warn", () => {});
  const f = fixture({ failAt: "audit", cleanupFailures: 3 });
  await assert.rejects(f.uploadVersion(actor, new File(["private payload"], "private.html"), "Private name", id), /fixture operation failed/);
  assert.equal(f.removed.length, 3);
  const [event, metadata] = warn.mock.calls[0].arguments;
  assert.equal(event, "upload.cleanup_failed");
  assert.deepEqual(Object.keys(metadata).sort(), ["objectCount", "version"]);
});
test("uncertain COMMIT never deletes a possibly active version", async t => {
  const warn = t.mock.method(console, "warn", () => {});
  const f = fixture({ failAt: "COMMIT" });
  await assert.rejects(f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id),
    error => error.status === 503 && error.message.includes("làm mới danh sách"));
  assert.equal(f.removed.length, 0); assert.equal(f.released(), true);
  assert.equal(warn.mock.calls[0].arguments[0], "upload.commit_outcome_unknown");
});
test("rollback failure discards the connection and does not mask the upload error", async () => {
  const f = fixture({ failAt: "audit", rollbackFails: true });
  await assert.rejects(f.uploadVersion(actor, new File(["probe"], "probe.html"), "Fixture", id), /fixture operation failed/);
  assert.equal(f.released(), true); assert.equal(f.removed.length, 1);
});
