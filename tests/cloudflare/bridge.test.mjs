import assert from 'node:assert/strict';
import { test,before,after } from 'node:test';
import { tsLoader } from '../helpers/load-ts.mjs';
import { zipBytes } from '../helpers/zip.mjs';
import { harness } from './harness.mjs';
const {runPilotUpload}=tsLoader()(new URL('../../src/lib/cloudflare-upload.ts',import.meta.url));
let h;
before(async()=>{h=await harness();});after(async()=>{await h?.close();});
function dependencies({loseFinalize=false,unavailableReceipt=false,tamper=false}={}) {
  const calls=[];
  const rpc=async(path,method='GET',body,key)=>{
    calls.push(path.includes('/finalize')?'finalize':path.includes('/abort')?'abort':path.includes('/cleanup')?'cleanup':path.includes('/receipts/')?'receipt':'other');
    if(unavailableReceipt&&path.includes('/receipts/')) throw new Error('synthetic lost receipt');
    const res=await h.api(path,{method,body,key});
    if(loseFinalize&&path.endsWith('/finalize')) throw new Error('synthetic lost acknowledgement');
    if(!res.ok) throw new Error('fixture RPC denial '+res.status);
    return res.json();
  };
  const store={
    async put(key,body) {assert.equal(await h.bucket.head(key),null);const obj=await h.bucket.put(key,body);return obj.etag;},
    async read(key,etag) {
      const obj=await h.bucket.get(key,{onlyIf:{etagMatches:etag}});
      return {etag:obj.etag,body:(async function*(){if(tamper) yield Buffer.from('corrupt');else for await(const chunk of obj.body)yield chunk;})()};
    },
  };
  return {rpc,store,calls};
}
test('production Node bridge validates ZIP and readback, publishes D1-only, updates same code and revokes content',async()=>{
  const d=dependencies();
  const bytes=zipBytes([{name:'index.html',body:'<script src="./assets/main.js"></script>'},{name:'assets/main.js',body:'window.synthetic=true'}]);
  const result=await runPilotUpload(d.rpc,d.store,new File([bytes],'relative.zip'),'Bridge fixture');
  const site=(await h.api('/v1/sites/'+result.id)).status;assert.equal(site,200);
  const initial=(await (await h.api('/v1/sites')).json()).sites.find(s=>s.id===result.id);
  assert.equal((await h.publicWorker.fetch(initial.share_url)).status,200);
  await runPilotUpload(d.rpc,d.store,new File(['updated'],'index.html'),'Updated',result.id);
  const updated=(await (await h.api('/v1/sites')).json()).sites.find(s=>s.id===result.id);assert.equal(updated.share_code,initial.share_code);
  assert.equal(await (await h.publicWorker.fetch(updated.share_url)).text(),'updated');
  await h.api('/v1/sites/'+result.id+'/share',{method:'DELETE'});
  assert.equal((await h.publicWorker.fetch(updated.share_url)).status,404);
});
test('bridge readback failure aborts before finalize and cleanup is fenced',async()=>{
  const d=dependencies({tamper:true});
  await assert.rejects(()=>runPilotUpload(d.rpc,d.store,new File(['valid'],'index.html'),'Corrupt fixture'));
  assert.ok(d.calls.includes('abort'));assert.ok(d.calls.includes('cleanup'));assert.ok(!d.calls.includes('finalize'));
});
test('lost finalize acknowledgement recovers receipt without cleanup; unknown outcome retains objects',async()=>{
  const d=dependencies({loseFinalize:true});
  const result=await runPilotUpload(d.rpc,d.store,new File(['verified'],'index.html'),'Lost acknowledgement');
  assert.ok(result.id);assert.ok(d.calls.includes('receipt'));assert.ok(!d.calls.includes('cleanup'));
  const unknown=dependencies({loseFinalize:true,unavailableReceipt:true});
  await assert.rejects(()=>runPilotUpload(unknown.rpc,unknown.store,new File(['retained'],'index.html'),'Unknown outcome'),e=>e.status===503);
  assert.ok(!unknown.calls.includes('abort'));assert.ok(!unknown.calls.includes('cleanup'));
});
test('invalid package rejected before R2 writes and cannot change published pointer',async()=>{
  const d=dependencies();let writes=0;d.store.put=async()=>{writes++;throw new Error('unexpected');};
  await assert.rejects(()=>runPilotUpload(d.rpc,d.store,new File([zipBytes([{name:'../index.html'}])],'bad.zip'),'Bad ZIP'),e=>e.status===400);
  assert.equal(writes,0);assert.ok(d.calls.includes('abort'));
});
