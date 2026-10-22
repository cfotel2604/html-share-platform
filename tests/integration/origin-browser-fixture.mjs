import assert from "node:assert/strict";
import pg from "pg";
import {writeFileSync} from "node:fs";
import {tsLoader} from "../helpers/load-ts.mjs";
import {zipBytes} from "../helpers/zip.mjs";
assert.equal(process.env.UPLOAD_TEST_GUARD,"isolated-upload-test");assert.equal(process.env.PGDATABASE,"upload_test");
const pool=new pg.Pool(),load=tsLoader({"./db":{db:()=>pool}});
const {resolveClerkActor}=load(new URL("../../src/lib/auth-policy.ts",import.meta.url));
const {uploadVersion,setPublished}=load(new URL("../../src/lib/site-ops.ts",import.meta.url));
const {createPreview}=load(new URL("../../src/lib/preview.ts",import.meta.url));
const email="browser-fixture@example.test";
await pool.query("INSERT INTO auth_allowlist(email,role,status) VALUES($1,'employee','active') ON CONFLICT(email) DO UPDATE SET status='active'",[email]);
const actor=await resolveClerkActor({id:"browser_fixture",primaryEmailAddressId:"e",banned:false,locked:false,emailAddresses:[{id:"e",emailAddress:email,verification:{status:"verified"}}],externalAccounts:[{provider:"oauth_google",emailAddress:email}]});
const script=`window.probe={};
for(const [name,fn] of Object.entries({cookieRead:()=>document.cookie,cookieWrite:()=>{document.cookie='injected=bad;Domain=matbao.test;Path=/;Secure'},localStorage:()=>localStorage.setItem('injected','bad'),sessionStorage:()=>sessionStorage.setItem('injected','bad')})) {try{fn();probe[name]='allowed'}catch{probe[name]='blocked'}}
probe.popup=window.open('/popup')===null?'blocked':'allowed';
if(window.top!==window){try{window.top.location.href='https://view.ods.test:4443/escape';probe.topNavigation='allowed'}catch{probe.topNavigation='blocked'}}else{probe.topNavigation='self';}
try{navigator.serviceWorker.register('/worker.js').then(()=>probe.serviceWorker='allowed',()=>probe.serviceWorker='blocked')}catch{probe.serviceWorker='blocked'}
try{new Worker('/worker.js');probe.worker='allowed'}catch{probe.worker='blocked'}
fetch('/data.json',{credentials:'omit'}).then(r=>r.json()).then(v=>probe.fetch=v.result).catch(()=>probe.fetch='failed');
document.body.dataset.executed='yes';`;
const html=`<!doctype html><title>Origin boundary fixture</title><link rel="stylesheet" href="/style.css"><p id="marker">Sandbox fixture ready</p><script src="./classic.js"></script><script type="module">import {value} from '/module.mjs';window.moduleWorked=value</script><script src="https://cdn.safe.test:4443/cdn.js"></script><script>${script}</script>`;
const file=new File([zipBytes([{name:"index.html",body:html},{name:"sub/page.htm",body:html},{name:"style.css",body:"#marker{color:rgb(2,132,199)}"},{name:"classic.js",body:"window.classicWorked=true"},{name:"module.mjs",body:"export const value='module-ok'"},{name:"data.json",body:'{"result":"fetch-ok"}'},{name:"worker.js",body:"postMessage('worker must not run')"}])],"browser-fixture.zip");
try {
  const published=await uploadVersion(actor,file,"Origin browser published fixture"),privateSite=await uploadVersion(actor,file,"Origin browser private fixture");
  await setPublished(actor,privateSite.id,false);
  Object.assign(process.env,{GATEWAY_MODE:"hostname",PUBLIC_SITE_DOMAIN:"matbao.test",PUBLIC_SITE_SCHEME:"https",PUBLIC_SITE_PORT:"4443"});
  const preview=await createPreview(actor,privateSite.id);
  writeFileSync("/app/browser-artifacts/fixture.json",JSON.stringify({published:published.id,privateSite:privateSite.id,previewUrl:preview.url}));
  console.log("Synthetic browser fixtures prepared; preview capability kept in ignored local artifact.");
} finally {await pool.end();}
