import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { createD1Writer,validateEvent,ProjectionError,MIN_INTERVAL_MS } from '../scripts/lib/public-projector.mjs';
import { runProjector } from '../scripts/project-public-outbox.mjs';

const event={id:'1',site_id:'a'.repeat(32),payload:[{share_code:'Token12345',site_id:'a'.repeat(32),status:'revoked',
  active_version:null,manifest:[],projection_version:1,updated_at:'2026-10-24T00:00:00.000Z'}]};
const token='SYNTHETIC_TOKEN_MUST_NOT_ESCAPE';
const options={accountId:'a'.repeat(32),databaseId:'00000000-0000-0000-0000-000000000033',token};
test('job is disabled without BOTH explicit enablement and remote approval, before provider access',async()=>{
  await assert.rejects(runProjector({}),/projector_disabled/);
  await assert.rejects(runProjector({PROJECTOR_ENABLED:'1'}),/projector_disabled/);
  await assert.rejects(runProjector({PROJECTOR_REMOTE_APPROVED:'1'}),/projector_disabled/);
  assert.equal(MIN_INTERVAL_MS,5000);
});
test('one exact-contract batch/event, token only in request headers, and no provider error text escapes',async()=>{
  const sql=await readFile(new URL('../cloudflare/read-model/queries/project.sql',import.meta.url),'utf8');
  let calls=0;
  const send=createD1Writer({...options,fetcher:async(url,request)=>{
    calls++;assert.ok(url.startsWith('https://api.cloudflare.com/client/v4/'));
    assert.equal(request.headers.Authorization,'Bearer '+token);assert.equal(request.redirect,'error');
    assert.ok(!request.body.includes(token));const body=JSON.parse(request.body);assert.equal(body.batch.length,1);assert.equal(body.batch[0].sql,sql);
    return Response.json({success:false,errors:[{message:token}]});
  }});
  await assert.rejects(send(event),error=>error instanceof ProjectionError&&error.code==='batch_failed'&&!String(error).includes(token));assert.equal(calls,1);
  const network=createD1Writer({...options,fetcher:async()=>{throw new Error(token);}});
  await assert.rejects(network(event),error=>error.code==='network'&&!String(error).includes(token));
});
test('payload whitelist rejects management data before any REST request',async()=>{
  for(const mutate of [
    row=>{row.email='synthetic@example.test';}, row=>{row.projection_version=0;},
    row=>{row.site_id='b'.repeat(32);},row=>{row.status='published';},
  ]) {
    const invalid=structuredClone(event);mutate(invalid.payload[0]);
    assert.throws(()=>validateEvent(invalid),error=>error.code==='invalid_event');
  }
});

test('only the separate projector owns D1 REST credentials/dispatch in runtime scripts',async()=>{
  async function scan(directory) {
    for(const entry of await readdir(directory,{withFileTypes:true})) {
      const path=new URL(entry.name+(entry.isDirectory()?'/':''),directory);
      if(entry.isDirectory()){await scan(path);continue;}
      if(!path.pathname.endsWith('.mjs') || /\/(?:lib\/public-projector|project-public-outbox)\.mjs$/.test(path.pathname))continue;
      assert.doesNotMatch(await readFile(path,'utf8'),/api\.cloudflare\.com|D1_PROJECTOR|d1\/database/,path.pathname);
    }
  }
  await scan(new URL('../scripts/',import.meta.url));
});
