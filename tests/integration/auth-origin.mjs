import assert from "node:assert/strict";
import pg from "pg";
import {S3Client,ListObjectsV2Command,PutObjectCommand} from "@aws-sdk/client-s3";
import {tsLoader} from "../helpers/load-ts.mjs";
import {virtualFetch} from "../helpers/http.mjs";
import {backfill} from "../../scripts/backfill-manifests.mjs";
import {createGateway} from "../../scripts/gateway.mjs";
import {createServer} from "node:http";
import {randomBytes,createHash} from "node:crypto";

assert.equal(process.env.UPLOAD_TEST_GUARD,"isolated-upload-test");assert.equal(process.env.PGDATABASE,"upload_test");
const pool=new pg.Pool();
const s3=new S3Client({region:"us-east-1",endpoint:process.env.STORAGE_ENDPOINT,forcePathStyle:true,
  credentials:{accessKeyId:process.env.STORAGE_ACCESS_KEY,secretAccessKey:process.env.STORAGE_SECRET_KEY}});
const load=tsLoader({"./db":{db:()=>pool}});
const ops=load(new URL("../../src/lib/site-ops.ts",import.meta.url));
const policy=load(new URL("../../src/lib/auth-policy.ts",import.meta.url));
const {createPreview}=load(new URL("../../src/lib/preview.ts",import.meta.url));
const passed=[];
const tag=randomBytes(6).toString("hex");
async function actor(label,role) {
  const email=`${tag}.${label}@example.test`;
  await pool.query("INSERT INTO auth_allowlist(email,role) VALUES($1,$2)",[email,role]);
  const user={id:tag+label,primaryEmailAddressId:"e",banned:false,locked:false,emailAddresses:[{id:"e",emailAddress:email,verification:{status:"verified"}}],externalAccounts:[{provider:"oauth_google",emailAddress:email}]};
  return {actor:await policy.resolveClerkActor(user),user,email};
}
const config={mode:"hostname",domain:"matbao.test",scheme:"https",port:"4443",previewOrigin:"https://studio.ods.test:4443",reserved:["f".repeat(32)]};
const server=createServer(createGateway({db:pool,s3,bucket:process.env.STORAGE_BUCKET,config}));
await new Promise(resolve=>server.listen(0,"0.0.0.0",resolve));
const gateway=`http://127.0.0.1:${server.address().port}`;
const headers=host=>({Host:host});
const read=(id,path="/",grant)=>virtualFetch(gateway+path,{headers:headers(`${id}${grant?"--"+grant:""}.matbao.test:4443`)});
const html=()=>new File(["<!doctype html><p>auth fixture</p>"],"fixture.html");
async function keys() {const all=[];let token;do{const listing=await s3.send(new ListObjectsV2Command({Bucket:process.env.STORAGE_BUCKET,ContinuationToken:token}));all.push(...(listing.Contents??[]).map(item=>item.Key));token=listing.NextContinuationToken;}while(token);return all.sort();}
let raceTrigger=false;
try {
  const a=await actor("a","employee"),b=await actor("b","employee"),admin=await actor("admin","admin");
  const siteA=await ops.uploadVersion(a.actor,html(),"Employee A fixture");
  const siteB=await ops.uploadVersion(b.actor,html(),"Employee B fixture");
  assert.ok((await ops.listSites(a.actor)).every(site=>site.id!==siteB.id));
  assert.ok((await ops.listSites(admin.actor)).some(site=>site.id===siteB.id));
  const before=await keys();
  await assert.rejects(ops.assertSiteOwner(a.actor,siteB.id),error=>error.status===404);
  await assert.rejects(ops.uploadVersion(a.actor,html(),"Denied",siteB.id),error=>error.status===404);
  await assert.rejects(ops.setPublished(a.actor,siteB.id,false),error=>error.status===404);
  assert.deepEqual(await keys(),before);
  await ops.uploadVersion(admin.actor,html(),"Admin audited update",siteB.id);
  const audit=await pool.query("SELECT 1 FROM audit_events WHERE actor_id=$1 AND action='site.update' AND target_id=$2",[admin.actor.id,siteB.id]);assert.equal(audit.rowCount,1);
  passed.push("Employee A/B create/list isolation, denied update/status zero writes, Admin update audit");
  await pool.query("UPDATE auth_allowlist SET status='disabled' WHERE email=$1",[a.email]);
  await assert.rejects(policy.resolveClerkActor(a.user),error=>error.status===403);
  await assert.rejects(ops.uploadVersion(a.actor,html(),"Revoked"),error=>error.status===403);
  await pool.query("UPDATE auth_allowlist SET status='active' WHERE email=$1",[a.email]);
  await pool.query("UPDATE users SET status='disabled' WHERE id=$1",[a.actor.id]);
  await assert.rejects(policy.resolveClerkActor(a.user),error=>error.status===403);
  await pool.query("UPDATE users SET status='active' WHERE id=$1",[a.actor.id]);
  await pool.query("UPDATE auth_allowlist SET role='employee' WHERE email=$1",[admin.email]);
  await assert.rejects(ops.uploadVersion(admin.actor,html(),"Stale admin role",siteB.id),error=>error.status===404);
  await pool.query("UPDATE auth_allowlist SET role='admin' WHERE email=$1",[admin.email]);
  passed.push("immediate policy/user revoke; stale Admin actor rechecked under transaction");
  await pool.query("CREATE OR REPLACE FUNCTION auth_test_pause() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(1); RETURN NEW; END $$");
  await pool.query("CREATE TRIGGER auth_test_pause BEFORE INSERT ON site_versions FOR EACH ROW EXECUTE FUNCTION auth_test_pause()");raceTrigger=true;
  const upload=ops.uploadVersion(a.actor,html(),"Policy lock fixture",siteA.id);
  let paused=false;for(let attempt=0;attempt<80;attempt++) {if((await pool.query("SELECT 1 FROM pg_stat_activity WHERE wait_event='PgSleep' AND query LIKE 'INSERT INTO site_versions%' AND pid<>pg_backend_pid()")).rowCount){paused=true;break;}await new Promise(resolve=>setTimeout(resolve,20));}
  assert.ok(paused);const rival=await pool.connect();
  try {await rival.query("SET lock_timeout='100ms'");await assert.rejects(rival.query("UPDATE auth_allowlist SET status='disabled' WHERE email=$1",[a.email]),error=>error.code==="55P03");}finally{rival.release();}
  await upload;await pool.query("DROP TRIGGER auth_test_pause ON site_versions");raceTrigger=false;
  passed.push("policy revocation cannot pass the mutation row lock");
  assert.equal((await read(siteA.id)).status,404,'Node is never a public reader');
  process.env.GATEWAY_MODE="hostname";process.env.PUBLIC_SITE_DOMAIN="matbao.test";process.env.PUBLIC_SITE_SCHEME="https";process.env.PUBLIC_SITE_PORT="4443";
  const publishedGrant=await createPreview(a.actor,siteA.id),publishedToken=new URL(publishedGrant.url).hostname.split('.')[0].split('--')[1];
  assert.equal((await read(siteA.id,'/',publishedToken)).status,200);
  const active=(await pool.query("SELECT active_version_id FROM sites WHERE id=$1",[siteA.id])).rows[0].active_version_id;
  const objectKey=`${siteA.id}/${active}/hidden.html`;
  await s3.send(new PutObjectCommand({Bucket:process.env.STORAGE_BUCKET,Key:objectKey,Body:"private unlisted object",ContentType:"text/html"}));
  assert.equal((await read(siteA.id,"/hidden.html",publishedToken)).status,404);
  for(const path of ["/test.svg","/test.xhtml","/test.xml","/test.pdf"])assert.equal((await read(siteA.id,path,publishedToken)).status,404);
  assert.equal((await virtualFetch(gateway+"/",{headers:headers("f".repeat(32)+".matbao.test:4443")})).status,404);
  passed.push("Node public denial; authorized preview root serving and reserved host/active formats/unlisted denial");
  await ops.setPublished(a.actor,siteA.id,false);assert.equal((await read(siteA.id)).status,404);
  process.env.GATEWAY_MODE="hostname";process.env.PUBLIC_SITE_DOMAIN="matbao.test";process.env.PUBLIC_SITE_SCHEME="https";process.env.PUBLIC_SITE_PORT="4443";
  const grant=await createPreview(a.actor,siteA.id),token=new URL(grant.url).hostname.split(".")[0].split("--")[1];
  assert.equal((await read(siteA.id,"/",token)).status,200);assert.equal((await read(siteB.id,"/",token)).status,404);
  await pool.query("UPDATE auth_allowlist SET status='disabled' WHERE email=$1",[a.email]);assert.equal((await read(siteA.id,"/",token)).status,404);
  await pool.query("UPDATE auth_allowlist SET status='active' WHERE email=$1",[a.email]);
  await pool.query("UPDATE preview_grants SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[createHash("sha256").update(token).digest("hex")]);assert.equal((await read(siteA.id,"/",token)).status,404);
  passed.push("unpublished preview grant version/site scope, revoke and TTL, public 404");
  const siteC=await ops.uploadVersion(b.actor,html(),"Legacy backfill fixture");
  const cVersion=(await pool.query("SELECT active_version_id FROM sites WHERE id=$1",[siteC.id])).rows[0].active_version_id;
  await pool.query("UPDATE site_versions SET asset_manifest=NULL WHERE id=$1",[cVersion]);assert.equal((await read(siteC.id)).status,404);
  // Restrict the fixture backfill query so deliberately unlisted objects elsewhere are untouched.
  const scoped={query:(sql,values)=>pool.query(sql.startsWith("SELECT id,site_id")?sql.replace("WHERE asset_manifest IS NULL","WHERE asset_manifest IS NULL AND id='"+cVersion+"'"):sql,values)};
  assert.equal(await backfill(scoped,s3,process.env.STORAGE_BUCKET),1);
  const cGrant=await createPreview(b.actor,siteC.id),cToken=new URL(cGrant.url).hostname.split('.')[0].split('--')[1];
  assert.equal((await read(siteC.id,'/',cToken)).status,200);assert.equal((await read(siteC.id)).status,404);
  await pool.query("UPDATE sites SET status='deleted' WHERE id=$1",[siteC.id]);assert.equal((await read(siteC.id)).status,404);
  passed.push("legacy manifest fingerprint verified without asset/pointer writes; deleted 404");
  console.log(JSON.stringify({result:"PASS",passed},null,2));
} finally {
  if(raceTrigger)await pool.query("DROP TRIGGER IF EXISTS auth_test_pause ON site_versions");
  await new Promise(resolve=>{server.closeAllConnections();server.close(resolve);});await pool.end();s3.destroy();
}
