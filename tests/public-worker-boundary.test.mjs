import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { buildPublicWorker } from '../scripts/build-public-worker.mjs';
import { assertReaderSource,assertReaderBundle } from './helpers/public-worker-guard.mjs';

const root=new URL('../',import.meta.url);
const sql=await readFile(new URL('cloudflare/read-model/queries/resolve.sql',root),'utf8');

test('actual Worker bundle dependency graph has one fixed SELECT and no write/network/management authority',async()=>{
  const {code,metafile}=await buildPublicWorker();let prepares=0;
  assertReaderBundle(code,sql);
  const owned=new Set(['cloudflare/public/worker.mjs','cloudflare/public/serve.mjs','cloudflare/public/policy.mjs','scripts/gateway-policy.mjs','cloudflare/read-model/queries/resolve.sql']);
  for(const input of Object.keys(metafile.inputs)){
    if(input.startsWith('node_modules/')){assert.match(input,/^node_modules\/tldts(?:-core)?\//);continue;}
    assert.ok(owned.has(input),'unexpected runtime input '+input);
    if(input.endsWith('.mjs'))prepares+=assertReaderSource(await readFile(new URL(input,root),'utf8'),input);
  }
  assert.equal(prepares,1);
  assert.ok(Object.keys(metafile.inputs).includes('cloudflare/read-model/queries/resolve.sql'));
  for(const output of Object.values(metafile.outputs))assert.equal(output.imports.length,0,'external runtime import');
  const compact=sql.replace(/--[^\n]*/g,'').replace(/\s+/g,' ').trim();
  assert.equal(compact,"SELECT site_id, active_version, manifest, projection_version, updated_at FROM public_read_model WHERE share_code = ? COLLATE BINARY AND status = 'published';");
});

test('static guard fails on write APIs/SQL, native alias escape, dynamic SQL and outbound calls',()=>{
  for(const source of ["const sql='INSERT INTO x VALUES(1)'","const sql='UPDATE x SET y=1'","const sql='DELETE FROM x'"]){
    assert.throws(()=>assertReaderSource(source),/write SQL literal/);
  }
  for(const source of ['env.ASSETS.put(key,body)','env.ASSETS.delete(key)','env.ASSETS["delete"](key)',
    'env.PUBLIC_READ_MODEL.batch([])','env.PUBLIC_READ_MODEL.exec(sql)','env.PUBLIC_READ_MODEL.prepare(resolveSql).bind(code).run()']){
    assert.throws(()=>assertReaderSource(source),/write\/unsafe provider API|fixed parameterized first query/);
  }
  assert.throws(()=>assertReaderSource('const raw=env.ASSETS'),/native binding escapes/);
  assert.throws(()=>assertReaderSource('env.PUBLIC_READ_MODEL.prepare(request.url).bind(code).first()'),/dynamic SQL/);
  assert.throws(()=>assertReaderSource('env.D1_PROJECTOR_API_TOKEN'),/unexpected environment/);
  assert.throws(()=>assertReaderSource('fetch("https://synthetic.example.test")'),/egress/);
});

test('local Worker config has only public D1/R2 plus origins, no management/preview/service bindings',async()=>{
  const source=await readFile(new URL('cloudflare/public/wrangler.jsonc',root),'utf8');
  const config=JSON.parse(source.replace(/^\s*\/\/.*$/gm,''));
  assert.equal(config.name,'hsp-pilot');assert.equal(config.main,'../../dist/public-worker/worker.mjs');
  assert.equal(config.no_bundle,true);assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);assert.equal(config.observability.enabled,false);
  assert.deepEqual(config.build,{command:'npm run build:public-worker'}); // Run CLI from repository root.
  assert.deepEqual(Object.keys(config.vars).sort(),['PUBLIC_ORIGIN','STUDIO_ORIGIN']);
  assert.equal(config.d1_databases.length,1);assert.equal(config.d1_databases[0].binding,'PUBLIC_READ_MODEL');assert.equal(config.d1_databases[0].remote,false);
  assert.equal(config.r2_buckets.length,1);assert.equal(config.r2_buckets[0].binding,'ASSETS');assert.equal(config.r2_buckets[0].remote,false);
  for(const key of Object.keys(config))assert.ok(['$schema','name','main','compatibility_date','no_bundle','build','workers_dev','preview_urls','observability','d1_databases','r2_buckets','vars'].includes(key),key);
});
