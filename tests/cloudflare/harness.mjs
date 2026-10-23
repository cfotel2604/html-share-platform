import { Miniflare,Log,LogLevel,convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import { mkdtemp,readFile,readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { createHash } from 'node:crypto';
export async function harness() {
  const folder=await mkdtemp(join(tmpdir(),'hsp-pilot-'));
  const entries={api:'tests/cloudflare/test-api.mjs',public:'cloudflare/public.mjs',preview:'cloudflare/preview.mjs'};
  const vars={PUBLIC_ORIGIN:'https://hsp.odsusercontent.workers.dev',PREVIEW_ORIGIN:'https://hsp-preview.odsusercontent.workers.dev',
    STUDIO_ORIGIN:'https://studio.ods.vn',API_ORIGIN:'https://hsp-api.odsusercontent.workers.dev',HSP_SERVICE_TOKEN:'synthetic-test-service-credential-only-123456789'};
  const workers=[];
  for(const [name,entry] of Object.entries(entries)) {
    const target=join(folder,name+'.mjs');
    await build({entryPoints:[resolve(entry)],outfile:target,bundle:true,format:'esm',platform:'browser',target:'es2022'});
    workers.push({name,modules:true,modulesRoot:folder,scriptPath:target,compatibilityDate:'2026-07-29',
      bindings:{...vars,PUBLIC_ORIGIN:name==='preview'?vars.PREVIEW_ORIGIN:vars.PUBLIC_ORIGIN},
      d1Databases:{DB:'hsp-pilot-test'},r2Buckets:{ASSETS:'hsp-pilot-test'}});
  }
  const mf=new Miniflare(convertV4MiniflareOptions({workers,log:new Log(LogLevel.NONE),inspectorPort:0}));
  const db=await mf.getD1Database('DB','api'),bucket=await mf.getR2Bucket('ASSETS','api');
  for(const name of (await readdir(resolve('cloudflare/migrations'))).filter(n=>n.endsWith('.sql')).sort()) {
    const sql=await readFile(resolve('cloudflare/migrations',name),'utf8');
    for(const part of sql.replace(/^--.*$/gm,'').split(';').filter(s=>s.trim())) await db.prepare(part).run();
  }
  for(const [id,role] of [['a','employee'],['b','employee'],['admin','admin']]) {
    await db.prepare('INSERT INTO auth_allowlist VALUES(?,?,?)').bind(id+'@example.test',role,'active').run();
    await db.prepare('INSERT INTO users VALUES(?,?,?,?)').bind(id,'clerk:'+id,id+'@example.test','active').run();
  }
  const apiWorker=await mf.getWorker('api'),publicWorker=await mf.getWorker('public'),previewWorker=await mf.getWorker('preview');
  async function api(path,{actor='a',method='GET',body,key=crypto.randomUUID()}={}) {
    return apiWorker.fetch(vars.API_ORIGIN+path,{method,headers:{'X-HSP-Service-Token':vars.HSP_SERVICE_TOKEN,
      Authorization:'Bearer fixture:'+actor,'Idempotency-Key':key,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  }
  async function upload(siteId,actor='a',files={'index.html':'<h1>synthetic</h1>','nested/page.htm':'<p>nested</p>','assets/data.json':'{"ok":true}'}) {
    const begin=await api('/v1/uploads',{method:'POST',actor,body:{name:'Synthetic',...(siteId?{siteId}:{})}});
    if(begin.status!==201) throw new Error('Fixture begin failed '+begin.status);
    const intent=await begin.json(),assets=[];
    const types={html:'text/html; charset=utf-8',htm:'text/html; charset=utf-8',json:'application/json; charset=utf-8',js:'text/javascript; charset=utf-8',mjs:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
    for(const [path,body] of Object.entries(files)) {
      const obj=await bucket.put(intent.storagePrefix+'/'+path,body);
      assets.push({path,type:types[path.split('.').at(-1)],size:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex'),etag:obj.etag});
    }
    return {intent,assets};
  }
  async function publish(siteId,actor='a',files) {
    const {intent,assets}=await upload(siteId,actor,files);
    const final=await api('/v1/uploads/'+intent.id+'/finalize',{method:'POST',actor,body:{assets}});
    if(final.status!==200) throw new Error('Fixture finalize failed '+final.status+' '+await final.text());
    const site=(await db.prepare('SELECT * FROM sites WHERE id=?').bind(intent.siteId).first());
    const code=(await db.prepare('SELECT code FROM site_share_links WHERE site_id=? AND revoked_at IS NULL').bind(site.id).first())?.code;
    return {site,code,intent,assets};
  }
  return {mf,db,bucket,vars,api,upload,publish,publicWorker,previewWorker,close:()=>mf.dispose()};
}
