import assert from "node:assert/strict";
import {test} from "node:test";
import {createServer,request as httpRequest} from "node:http";
import {Readable} from "node:stream";
import {createHash} from "node:crypto";
import {createGateway,gatewayConfig} from "../scripts/gateway.mjs";
import {mapHostRequest} from "../scripts/gateway-policy.mjs";
import {publicOriginConfig} from "../scripts/origin-config.mjs";
const id="a".repeat(32),version="12345678-1234-1234-1234-123456789abc",grant='b'.repeat(26);
const config={mode:"hostname",domain:"matbao.test",scheme:"https",port:"",viewerOrigin:"https://studio.ods.test",previewOrigin:'https://studio.ods.test',reserved:["b".repeat(32)]};
test("strict per-site hosts and root/relative asset mapping",()=>{
  assert.deepEqual(mapHostRequest(id+".matbao.test","/css/style.css?v=1",config),{id,asset:"css/style.css",type:"text/css; charset=utf-8",grant:null});
  for(const host of ["matbao.test","evil.test",id+".matbao.test.evil.test",id+".sub.matbao.test",id+".matbao.test.",id+".matbao.test:444",id+".matbao.test,evil.test","b".repeat(32)+".matbao.test"]) assert.equal(mapHostRequest(host,"/",config),null,host);
  for(const path of ["/../index.html","/%2e%2e/index.html","/%252e%252e/index.html","/%2Fsecret.html","/test.svg","/test.xhtml","/test.xml","/test.pdf"]) assert.equal(mapHostRequest(id+".matbao.test",path,config),null,path);
});

test("A' preview namespace is exactly a 62-character label with a complete grant",()=>{
  const grant="c".repeat(26),label=`p-${id}--${grant}`;
  assert.equal(label.length,62);
  assert.deepEqual(mapHostRequest(label+".matbao.test","/",config),{id,asset:"index.html",type:"text/html; charset=utf-8",grant});
  for(const host of [`${id}--${grant}.matbao.test`,`p-${id}.matbao.test`,`p-${id}--${grant.slice(1)}.matbao.test`,
    `p-${id}--${grant}x.matbao.test`,`p-${id}--${grant}.matbao.test.evil.test`,`p-${id}--${grant}.sub.matbao.test`])
    assert.equal(mapHostRequest(host,"/",config),null);
});
test("public HTTP hostnames and malformed config fail closed",()=>{
  assert.throws(()=>gatewayConfig({GATEWAY_MODE:"hostname",PUBLIC_SITE_DOMAIN:"matbao.one",PUBLIC_SITE_SCHEME:"http"}));
  assert.throws(()=>gatewayConfig({GATEWAY_VIEWER_ORIGIN:"https://view.test/path"}));
});
test("shared registrable domains are rejected, including multi-part/private suffixes",()=>{
  for(const domain of ["ods.vn","sites.ods.vn","example.co.uk","uploads.example.co.uk","tenant.github.io"]) {
    const dashboard=domain.includes("co.uk")?"studio.example.co.uk":domain.includes("github.io")?"studio.tenant.github.io":"studio.ods.vn";
    assert.throws(()=>publicOriginConfig({PUBLIC_SITE_DOMAIN:domain,AUTH_TRUSTED_ORIGINS:"https://"+dashboard}),/different registrable domains/);
  }
  assert.equal(publicOriginConfig({PUBLIC_SITE_DOMAIN:"matbao.one",AUTH_TRUSTED_ORIGINS:"https://studio.ods.vn",VIEWER_PUBLIC_ORIGIN:"https://view.ods.vn",PUBLIC_SITE_PORT:"443"}).port,"");
});
async function fixture(t,{manifest=true,corrupt=false}={}) {
  const body=Buffer.from("<!doctype html><p>sandbox fixture</p>"),queries=[],keys=[];
  const entry={path:"index.html",type:"text/html; charset=utf-8",size:body.length,sha256:createHash("sha256").update(body).digest("hex")};
  const db={query:async(sql,values)=>{queries.push({sql,values});return {rowCount:1,rows:[{storage_prefix:`${id}/${version}`,asset_manifest:manifest?[entry]:null}]};}};
  const s3={send:async(command)=>{keys.push(command.input);return {ContentLength:body.length,Body:Readable.from([corrupt?Buffer.alloc(body.length):body])};}};
  const server=createServer(createGateway({db,s3,bucket:"private-fixture",config}));
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  const url=`http://127.0.0.1:${server.address().port}`;
  return {queries,keys,read:(path="/",host='p-'+id+'--'+grant+".matbao.test",extra={})=>new Promise((resolve,reject)=>{
    const request=httpRequest(url+path,{headers:{Host:host,...extra}},async response=>{
      const chunks=[];for await(const chunk of response) chunks.push(chunk);
      resolve(new Response(Buffer.concat(chunks),{status:response.statusCode,headers:response.headers}));
    });request.on("error",reject);request.end();
  })};
}
test("unknown host is rejected before DB/storage even with spoofed forwarded host",async t=>{
  const f=await fixture(t);assert.equal((await f.read("/","evil.test",{"X-Forwarded-Host":id+".matbao.test"})).status,404);assert.equal(f.queries.length,0);assert.equal(f.keys.length,0);
});

test("namespaced preview uses the hashed grant; old grant hosts cannot query PG or R2",async t=>{
  const f=await fixture(t),grant="c".repeat(26);
  const denied=await f.read("/",`${id}--${grant}.matbao.test`);
  assert.equal(denied.status,404);assert.equal(f.queries.length,0);assert.equal(f.keys.length,0);
  const preview=await f.read("/",`p-${id}--${grant}.matbao.test`);
  assert.equal(preview.status,200);
  assert.deepEqual(f.queries[0].values,[id,createHash("sha256").update(grant).digest("hex")]);
  assert.match(f.queries[0].sql,/g\.expires_at>now\(\)/);
  assert.match(preview.headers.get("content-security-policy"),/^sandbox allow-scripts;/);
  assert.equal(preview.headers.get("set-cookie"),null);
});
test("gateway requires manifest membership and never probes arbitrary private keys",async t=>{
  const f=await fixture(t);assert.equal((await f.read("/hidden.html")).status,404);assert.equal(f.keys.length,0);
  const legacy=await fixture(t,{manifest:false});assert.equal((await legacy.read()).status,404);assert.equal(legacy.keys.length,0);
});
test("preview HTML enforces HTTP sandbox, no auth cookies, scoped grant and no-store",async t=>{
  const f=await fixture(t);const response=await f.read("/",'p-'+id+'--'+grant+".matbao.test",{Cookie:"session=synthetic; role=admin",Authorization:"Bearer synthetic"});
  assert.equal(response.status,200);assert.match(response.headers.get("content-security-policy"),/^sandbox allow-scripts;/);
  assert.ok(!response.headers.get("content-security-policy").includes("allow-same-origin"));
  assert.match(response.headers.get('content-security-policy'),/frame-ancestors https:\/\/studio\.ods\.test/);
  assert.equal(response.headers.get("cache-control"),"no-store");assert.equal(response.headers.get("set-cookie"),null);
  assert.equal(response.headers.get("access-control-allow-origin"),"*");assert.equal(response.headers.get("access-control-allow-credentials"),null);
  assert.deepEqual(Object.keys(f.keys[0]).sort(),["Bucket","Key"]);assert.deepEqual(f.queries[0].values,[id,createHash('sha256').update(grant).digest('hex')]);
  assert.match(f.queries[0].sql,/preview_grants/);
});
test('published Node hostname and local-path aliases cannot reach PostgreSQL or R2',async t=>{
  const f=await fixture(t);
  assert.equal((await f.read('/',id+'.matbao.test')).status,404);assert.equal(f.queries.length,0);assert.equal(f.keys.length,0);
  const server=createServer(createGateway({db:{query:()=>assert.fail('Public lookup')},s3:{send:()=>assert.fail('Public storage')},bucket:'fixture',config:{...config,mode:'local-path'}}));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
  assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/s/${id}/`)).status,404);
});
test("changed private object bytes cannot bypass immutable manifest integrity",async t=>{
  const f=await fixture(t,{corrupt:true});assert.equal((await f.read()).status,503);
});
