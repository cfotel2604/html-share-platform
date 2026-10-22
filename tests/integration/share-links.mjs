import assert from "node:assert/strict";
import pg from "pg";
import { randomBytes } from "node:crypto";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { tsLoader } from "../helpers/load-ts.mjs";
import { virtualFetch as fetch } from "../helpers/http.mjs";
import { allocateShareCode, createShareCode } from "../../scripts/share-codes.mjs";
import { backfillShareLinks } from "../../scripts/backfill-share-links.mjs";

assert.equal(process.env.UPLOAD_TEST_GUARD, "isolated-upload-test");
assert.equal(process.env.PGDATABASE, "upload_test");
const pool = new pg.Pool(), web = "http://web:3000", gateway = "http://gateway:4000";
const host = "127.0.0.1:3700", origin = "http://" + host;
const s3 = new S3Client({ region: "us-east-1", endpoint: process.env.STORAGE_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY, secretAccessKey: process.env.STORAGE_SECRET_KEY } });
const load = tsLoader({ "./db": { db: () => pool } });
const { changeShareLink, resolveViewerSite } = load(new URL("../../src/lib/share-links.ts", import.meta.url));
const { resolveClerkActor } = load(new URL("../../src/lib/auth-policy.ts", import.meta.url));
const passed = [], tag = randomBytes(6).toString("hex");
let trigger = false;
const read = path => fetch(web + path, { headers: { Host: host } });
async function snapshot(id) { return (await pool.query("SELECT * FROM sites WHERE id=$1", [id])).rows[0]; }
async function objects() {
  const keys = []; let token;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: process.env.STORAGE_BUCKET, ContinuationToken: token }));
    keys.push(...(page.Contents ?? []).map(item => item.Key)); token = page.NextContinuationToken;
  } while (token);
  return keys.sort();
}
try {
  const login = await fetch(web + "/api/auth", { method: "POST", headers: { Host: host, Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.LOCAL_DEMO_PASSWORD }) });
  assert.equal(login.status, 200);
  const headers = { Host: host, Origin: origin, Cookie: login.headers.get("set-cookie").split(";")[0] };
  async function list() { return (await (await fetch(web + "/api/sites", { headers })).json()).sites; }
  async function send(file, id) {
    const body = new FormData(); body.set("name", "Short link fixture"); body.set("file", file);
    return fetch(web + "/api/sites" + (id ? "/" + id : ""), { method: id ? "PUT" : "POST", headers, body });
  }
  async function share(id, method = "POST", customHeaders = headers) {
    return fetch(web + "/api/sites/" + id + "/share", { method, headers: customHeaders });
  }
  const html = () => new File(["<!doctype html><p>short link fixture</p>"], "fixture.html");
  const created = await send(html()); assert.equal(created.status, 201);
  const { id } = await created.json();
  let site = (await list()).find(item => item.id === id), original = site.share_code;
  assert.match(original, /^[A-Za-z0-9]{10}$/); assert.equal(site.share_url, "/view/" + original);
  const before = await snapshot(id), stored = await objects();
  const viewer = await read(site.share_url);
  assert.equal(viewer.status, 200); assert.match(await viewer.text(), /sandbox="allow-scripts"/);
  assert.match(viewer.headers.get("cache-control"), /no-store/);
  assert.equal(viewer.headers.get("referrer-policy"), "no-referrer"); assert.equal(viewer.headers.get("set-cookie"), null);
  assert.equal((await read("/" + original)).status, 200);
  for (const path of ["/view/" + id, "/" + id, "/view/invalid"])
    assert.equal((await read(path)).status, 404);
  const flipped = original.replace(/[A-Za-z]/, char => char === char.toLowerCase() ? char.toUpperCase() : char.toLowerCase());
  if (flipped !== original) assert.equal((await read("/view/" + flipped)).status, 404);
  assert.equal((await send(html(), id)).status, 200);
  assert.equal((await list()).find(item => item.id === id).share_code, original);
  passed.push("HTTP canonical short viewer, exact case/no cookie/no-store/sandbox, old ID aliases 404, version update keeps code");

  const activeBeforeRotation = await snapshot(id), keysBeforeRotation = await objects();
  const rotated = await share(id); assert.equal(rotated.status, 200);
  let current = await rotated.json();
  assert.notEqual(current.share_code, original); assert.equal((await read("/view/" + original)).status, 404);
  assert.equal((await read(current.share_url)).status, 200);
  assert.deepEqual(await snapshot(id), activeBeforeRotation); assert.deepEqual(await objects(), keysBeforeRotation);
  const direct = await fetch(gateway + "/s/" + id + "/", { headers: { Host: "127.0.0.1:4700" } });
  assert.equal(direct.status, 200);
  assert.equal((await share(id, "DELETE")).status, 200);
  assert.equal((await read(current.share_url)).status, 404);
  assert.equal((await send(html(), id)).status, 200);
  assert.equal((await list()).find(item => item.id === id).share_url, null);
  for (const published of [false, true]) {
    assert.equal((await fetch(web + "/api/sites/" + id, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ published }) })).status, 200);
    assert.equal((await list()).find(item => item.id === id).share_code, null);
  }
  current = await (await share(id)).json();
  assert.notEqual(current.share_code, original); assert.equal((await read(current.share_url)).status, 200);
  assert.equal((await share(id, "POST", { ...headers, Origin: "https://attacker.invalid" })).status, 403);
  assert.equal((await share(id, "DELETE", { Host: host, Origin: origin })).status, 401);
  assert.equal((await share("invalid")).status, 400);
  passed.push("rotate/revoke/reissue atomic; host/storage/pointer unchanged; direct content stays public; update/republish do not resurrect links; CSRF/guest denied");

  const foreignEmail = tag + ".foreign@example.test";
  await pool.query("INSERT INTO auth_allowlist(email,role) VALUES($1,'employee')", [foreignEmail]);
  const actor = await resolveClerkActor({ id: tag, primaryEmailAddressId: "e", banned: false, locked: false,
    emailAddresses: [{ id: "e", emailAddress: foreignEmail, verification: { status: "verified" } }],
    externalAccounts: [{ provider: "oauth_google", emailAddress: foreignEmail }] });
  const foreign = randomBytes(16).toString("hex"), deleted = randomBytes(16).toString("hex");
  await pool.query("INSERT INTO sites(id,owner_id,display_name,status) VALUES($1,$2,'Legacy fixture','draft'),($3,$2,'Deleted fixture','deleted')", [foreign, actor.id, deleted]);
  for (const method of ["POST", "DELETE"])
    assert.equal((await share(foreign, method)).status, 404);
  const legacyBefore = await snapshot(foreign);
  const missing = (await pool.query("SELECT count(*)::int AS n FROM sites s WHERE status<>'deleted' AND NOT EXISTS(SELECT 1 FROM site_share_links l WHERE l.site_id=s.id)")).rows[0].n;
  const counts = await Promise.all([backfillShareLinks(pool), backfillShareLinks(pool)]);
  assert.equal(counts[0] + counts[1], missing);
  assert.deepEqual(await snapshot(foreign), legacyBefore); assert.equal(await backfillShareLinks(pool), 0);
  assert.equal((await pool.query("SELECT 1 FROM site_share_links WHERE site_id=$1", [deleted])).rowCount, 0);
  const foreignCode = (await pool.query("SELECT code FROM site_share_links WHERE site_id=$1 AND revoked_at IS NULL", [foreign])).rows[0].code;
  await changeShareLink(actor, foreign, "revoke");
  await backfillShareLinks(pool);
  assert.equal((await pool.query("SELECT 1 FROM site_share_links WHERE site_id=$1 AND revoked_at IS NULL", [foreign])).rowCount, 0);
  const client = await pool.connect();
  try {
    await client.query("BEGIN"); await client.query("SELECT id FROM sites WHERE id=$1 FOR UPDATE", [foreign]);
    let attempts = 0; const fresh = createShareCode();
    assert.equal(await allocateShareCode(client, foreign, () => ++attempts === 1 ? foreignCode : fresh), fresh);
    assert.equal(attempts, 2); await client.query("COMMIT");
  } finally { client.release(); }
  assert.equal(await resolveViewerSite(foreignCode), null);
  await assert.rejects(changeShareLink(actor, id, "rotate"), error => error.status === 404);
  await pool.query("UPDATE auth_allowlist SET status='disabled' WHERE email=$1", [foreignEmail]);
  await assert.rejects(changeShareLink(actor, foreign, "revoke"), error => error.status === 403);
  await pool.query("UPDATE auth_allowlist SET status='active',role='admin' WHERE email=$1", [foreignEmail]);
  const admin = { ...actor, role: "admin" };
  await changeShareLink(admin, id, "rotate");
  await pool.query("UPDATE auth_allowlist SET role='employee' WHERE email=$1", [foreignEmail]);
  await assert.rejects(changeShareLink(admin, id, "revoke"), error => error.status === 404);
  assert.ok((await pool.query("SELECT 1 FROM audit_events WHERE actor_id=$1 AND action='site.share.rotate' AND target_id=$2", [actor.id, id])).rowCount);
  passed.push("fresh Employee/Admin/revoke/role scope and actor audit; concurrent metadata-only backfill idempotent, deleted excluded; tombstones reserved and revoked links not reactivated");

  site = (await list()).find(item => item.id === id); original = site.share_code;
  await pool.query("CREATE OR REPLACE FUNCTION share_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='site.share.rotate' THEN RAISE EXCEPTION 'synthetic audit failure'; END IF; RETURN NEW; END $$");
  await pool.query("CREATE TRIGGER share_test_fail_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION share_test_fail_audit()"); trigger = true;
  const failed = await share(id); assert.equal(failed.status, 500); assert.ok(!(await failed.text()).includes("synthetic audit failure"));
  assert.equal((await read("/view/" + original)).status, 200);
  await pool.query("DROP TRIGGER share_test_fail_audit ON audit_events"); trigger = false;
  const raced = await Promise.all([share(id), share(id)]);
  const results = await Promise.all(raced.map(async response => { assert.equal(response.status, 200); return response.json(); }));
  const live = (await pool.query("SELECT code FROM site_share_links WHERE site_id=$1 AND revoked_at IS NULL", [id])).rows;
  assert.equal(live.length, 1);
  for (const result of results) assert.equal((await read(result.share_url)).status, result.share_code === live[0].code ? 200 : 404);
  passed.push("audit failure rollback preserves old link; competing rotations serialize to exactly one active code");

  const wrapper = { connect: async () => {
    const connection = await pool.connect();
    return { query: async (...args) => {
      const result = await connection.query(...args);
      if (args[0] === "COMMIT") throw new Error("Synthetic lost COMMIT response");
      return result;
    }, release: discard => connection.release(discard) };
  } };
  const uncertain = tsLoader({ "./db": { db: () => wrapper } })(new URL("../../src/lib/share-links.ts", import.meta.url));
  await assert.rejects(uncertain.changeShareLink(actor, foreign, "rotate"), error => error.status === 503);
  assert.equal((await pool.query("SELECT 1 FROM site_share_links WHERE site_id=$1 AND revoked_at IS NULL", [foreign])).rowCount, 1);
  await pool.query("UPDATE sites SET status='deleted' WHERE id=$1", [id]);
  assert.equal((await read("/view/" + live[0].code)).status, 404);
  const finalKeys = await objects();
  assert.equal(before.owner_id, (await snapshot(id)).owner_id); assert.ok(stored.every(key => finalKeys.includes(key)));
  passed.push("lost COMMIT response returns 503 without unsafe compensation; deleted viewer denied; existing ownership/data preserved");
  console.log(JSON.stringify({ result: "PASS", passed }, null, 2));
} finally {
  if (trigger) await pool.query("DROP TRIGGER IF EXISTS share_test_fail_audit ON audit_events");
  await pool.end(); s3.destroy();
}
