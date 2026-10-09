import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import pg from "pg";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { zipBytes, hostileZips } from "../helpers/zip.mjs";
import {virtualFetch as fetch} from "../helpers/http.mjs";

assert.equal(process.env.UPLOAD_TEST_GUARD, "isolated-upload-test", "Run only with the isolated Compose overlay");
assert.equal(process.env.PGDATABASE, "upload_test", "Refuse the owner lab database");
const web = "http://web:3000", gateway = "http://gateway:4000";
const origin="http://127.0.0.1:3700",host="127.0.0.1:3700";
async function readGateway(path) {return fetch(gateway+path,{headers:{Host:"127.0.0.1:4700"}});}
const pool = new pg.Pool();
const s3 = new S3Client({ region: "us-east-1", endpoint: process.env.STORAGE_ENDPOINT, forcePathStyle: true,
  credentials: { accessKeyId: process.env.STORAGE_ACCESS_KEY, secretAccessKey: process.env.STORAGE_SECRET_KEY } });
const passed = [];
const login = await fetch(web + "/api/auth", { method: "POST", headers: { Origin: origin,Host:host, "Content-Type": "application/json" },
  body: JSON.stringify({ password: process.env.LOCAL_DEMO_PASSWORD }) });
assert.equal(login.status, 200);
const cookie = login.headers.get("set-cookie").split(";")[0];
const headers = { Cookie: cookie, Origin: origin,Host:host };
await pool.query("UPDATE users SET role='employee' WHERE external_identity='local-demo:owner'");
async function listKeys() {
  const keys = []; let token;
  do {
    let result;
    try { result = await s3.send(new ListObjectsV2Command({ Bucket: process.env.STORAGE_BUCKET, ContinuationToken: token })); }
    catch (error) { if (error.name === "NoSuchBucket") return []; throw error; }
    keys.push(...(result.Contents ?? []).map(item => item.Key)); token = result.NextContinuationToken;
  } while (token);
  return keys.sort();
}
async function snapshot(id) {
  return (await pool.query("SELECT status, owner_id, active_version_id, display_name, updated_at FROM sites WHERE id=$1", [id])).rows[0];
}
async function send(file, id) {
  const form = new FormData(); form.set("name", "Upload integration fixture"); form.set("file", file);
  return fetch(web + "/api/sites" + (id ? "/" + id : ""), { method: id ? "PUT" : "POST", headers, body: form });
}
const html = () => new File(["<!doctype html><p>integration v1</p>"], "fixture.html", { type: "text/html" });
function rawUpload(path, customHeaders = {}) {
  const request = http.request(web + path, { method: "POST", headers: { ...headers, "Content-Type": "multipart/form-data; boundary=probe", ...customHeaders } });
  const response = new Promise((resolve, reject) => {
    request.on("response", async incoming => {
      const chunks = []; for await (const chunk of incoming) chunks.push(chunk);
      resolve({ status: incoming.statusCode, text: Buffer.concat(chunks).toString() });
    });
    request.on("error", reject);
  });
  return { request, response };
}
try {
  assert.equal((await fetch(web + "/api/sites",{headers:{Host:host}})).status, 401);
  const created = await send(html()); assert.equal(created.status, 201);
  const { id } = await created.json();
  const initial = await snapshot(id), initialKeys = await listKeys();
  passed.push("authenticated HTML create; guest 401");

  // No Content-Length: continue an intentionally much larger stream until the server rejects it.
  const chunked = rawUpload("/api/sites");
  let responded = false, sent = 0;
  chunked.response.then(() => { responded = true; });
  chunked.request.write('--probe\r\nContent-Disposition: form-data; name="padding"\r\n\r\n');
  for (; sent < 80 && !responded; sent++) {
    if (!chunked.request.write(Buffer.alloc(1024 * 1024, 97))) {
      await Promise.race([once(chunked.request, "drain"), chunked.response]);
    }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  if (!responded) chunked.request.end("\r\n--probe--\r\n");
  const limited = await chunked.response;
  chunked.request.destroy();
  assert.equal(limited.status, 413, "chunked overflow must return 413");
  assert.ok(sent < 80, "Reject before the whole stream is sent");
  assert.deepEqual(await listKeys(), initialKeys);
  passed.push("chunked body rejected early with 413 and zero objects");

  const declared = rawUpload("/api/sites", { "Content-Length": String(23 * 1024 * 1024) });
  declared.request.flushHeaders();
  assert.equal((await declared.response).status, 413); declared.request.destroy();
  passed.push("declared oversize rejected without sending body");

  const other = (await pool.query("INSERT INTO users(external_identity,role) VALUES('upload-test:foreign','employee') ON CONFLICT(external_identity) DO UPDATE SET status='active' RETURNING id")).rows[0].id;
  const foreignId = "b".repeat(32), deletedId = "c".repeat(32), unknownId = "d".repeat(32);
  await pool.query("INSERT INTO sites(id,owner_id,display_name,status) VALUES($1,$2,'Foreign fixture','draft'),($3,$4,'Deleted fixture','deleted') ON CONFLICT(id) DO NOTHING", [foreignId, other, deletedId, initial.owner_id]);
  for (const deniedId of [foreignId, deletedId, unknownId]) {
    const response = await send(html(), deniedId); assert.equal(response.status, 404);
    assert.deepEqual(await listKeys(), initialKeys);
  }
  passed.push("foreign/deleted/unknown update 404 with zero object writes");

  // Authorization changes after preflight, while multipart is still being received.
  const body = new Request(web, { method: "POST", body: (() => { const form = new FormData(); form.set("name", "Race fixture"); form.set("file", html()); return form; })() });
  const bytes = Buffer.from(await body.arrayBuffer());
  const racing = http.request(web + "/api/sites/" + id, { method: "PUT", headers: { ...headers, "Content-Type": body.headers.get("content-type") } });
  const raceResponse = new Promise((resolve, reject) => { racing.on("response", response => { response.resume(); resolve(response.statusCode); }); racing.on("error", reject); });
  racing.write(bytes.subarray(0, bytes.length - 8));
  await new Promise(resolve => setTimeout(resolve, 200));
  await pool.query("UPDATE sites SET owner_id=$2 WHERE id=$1", [id, other]);
  racing.end(bytes.subarray(bytes.length - 8));
  assert.equal(await raceResponse, 404); assert.deepEqual(await listKeys(), initialKeys);
  await pool.query("UPDATE sites SET owner_id=$2 WHERE id=$1", [id, initial.owner_id]);
  assert.deepEqual(await snapshot(id), initial);
  passed.push("owner changed during body ingest is rejected before storage");

  // Fail after real storage writes; SQL rollback and exact-key cleanup must preserve the old version.
  await pool.query("CREATE OR REPLACE FUNCTION upload_test_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='site.update' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$");
  await pool.query("CREATE TRIGGER upload_test_fail_audit BEFORE INSERT ON audit_events FOR EACH ROW EXECUTE FUNCTION upload_test_fail_audit()");
  const failed = await send(new File([zipBytes([{ name: "index.html" }, { name: "style.css" }])], "fixture.zip"), id);
  assert.equal(failed.status, 500); assert.ok(!(await failed.text()).includes("fixture audit failure"));
  assert.deepEqual(await snapshot(id), initial); assert.deepEqual(await listKeys(), initialKeys);
  assert.match(await (await readGateway("/s/" + id + "/")).text(), /integration v1/);
  await pool.query("DROP TRIGGER upload_test_fail_audit ON audit_events");
  passed.push("post-storage DB failure rolls back and cleans new objects; old active version remains readable");

  // Pause within the upload transaction and prove concurrent delete/reassign cannot pass its row lock.
  await pool.query("CREATE OR REPLACE FUNCTION upload_test_pause_version() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(1.2); RETURN NEW; END $$");
  await pool.query("CREATE TRIGGER upload_test_pause_version BEFORE INSERT ON site_versions FOR EACH ROW EXECUTE FUNCTION upload_test_pause_version()");
  const updating = send(html(), id);
  let paused = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = await pool.query("SELECT 1 FROM pg_stat_activity WHERE wait_event='PgSleep' AND query LIKE 'INSERT INTO site_versions%' AND pid<>pg_backend_pid()");
    if (result.rowCount) { paused = true; break; }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.ok(paused, "Upload reached the locked transaction");
  const rival = await pool.connect();
  try {
    await rival.query("SET lock_timeout='100ms'");
    await assert.rejects(rival.query("UPDATE sites SET owner_id=$2,status='deleted' WHERE id=$1", [id, other]), error => error.code === "55P03");
  } finally { rival.release(); }
  assert.equal((await updating).status, 200);
  await pool.query("DROP TRIGGER upload_test_pause_version ON site_versions");
  passed.push("concurrent delete/reassign waits for the ownership lock");

  const current = await snapshot(id), currentKeys = await listKeys();
  for (const [label, data] of hostileZips()) {
    const response = await send(new File([data], "hostile.zip"), id);
    assert.equal(response.status, 400, label);
    assert.deepEqual(await snapshot(id), current, label);
    assert.deepEqual(await listKeys(), currentKeys, label);
  }
  passed.push("21 hostile ZIP variants rejected with unchanged active version/storage");
  const zip = await send(new File([zipBytes([{ name: "index.html", body: '<link rel="stylesheet" href="style.css"><p>ZIP fixture</p>' }, { name: "style.css", body: "body{color:navy}" }])], "valid.zip"), id);
  assert.equal(zip.status, 200);
  const served = await readGateway("/s/" + id + "/");
  assert.equal(served.status, 200); assert.match(served.headers.get("content-security-policy"), /sandbox allow-scripts/);
  assert.equal(served.headers.get("cache-control"), "no-store");
  assert.equal((await readGateway("/s/" + id + "/style.css")).status, 200);
  const disabled = await fetch(web + "/api/sites/" + id, { method: "PATCH", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ published: false }) });
  assert.equal(disabled.status, 200);
  assert.equal((await readGateway("/s/" + id + "/style.css")).status, 404);
  passed.push("valid ZIP update, sandbox/no-store, assets and unpublish 404");
  console.log(JSON.stringify({ result: "PASS", passed }, null, 2));
} finally {
  await pool.query("DROP TRIGGER IF EXISTS upload_test_fail_audit ON audit_events");
  await pool.query("DROP TRIGGER IF EXISTS upload_test_pause_version ON site_versions");
  await pool.end(); s3.destroy();
}
