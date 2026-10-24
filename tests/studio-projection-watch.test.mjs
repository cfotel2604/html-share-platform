import assert from 'node:assert/strict';
import {test} from 'node:test';
import {tsLoader} from './helpers/load-ts.mjs';

test('pending refreshes do not overlap; failure stays visible until recovery and drained queue stops',async()=>{
  const load=tsLoader(),{watchProjection}=load(new URL('../src/features/studio/watch-projection.ts',import.meta.url));
  const {StudioApiError}=load(new URL('../src/features/studio/api.ts',import.meta.url));
  const timers=[],events=[];let calls=0;
  const dispose=watchProjection({listSites:async()=>{calls++;if(calls===1)throw new StudioApiError('offline',503);return[{projection:{pending:false}}];}},
    {sites:items=>events.push(items[0].projection.pending?'pending':'drained'),unavailable:()=>events.push('stale'),unauthorized:()=>events.push('unauthorized')},
    {visible:()=>true,schedule:run=>{timers.push(run);return timers.length;},cancel:()=>{}});
  assert.equal(calls,0);timers.shift()();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,['stale']);assert.equal(timers.length,1);
  timers.shift()();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(events,['stale','drained']);assert.equal(timers.length,0);dispose();
});

test('a response arriving after logout is ignored; revoked authorization stops further refresh',async()=>{
  const load=tsLoader(),{watchProjection}=load(new URL('../src/features/studio/watch-projection.ts',import.meta.url));
  const {StudioApiError}=load(new URL('../src/features/studio/api.ts',import.meta.url));
  let resolve,run,calls=0;const events=[];
  const runtime={visible:()=>true,schedule:fn=>{run=fn;return 1;},cancel:()=>{}};
  const callbacks={sites:()=>events.push('sites'),unavailable:()=>events.push('stale'),unauthorized:()=>events.push('unauthorized')};
  const dispose=watchProjection({listSites:()=>{calls++;return new Promise(r=>{resolve=r;});}},callbacks,runtime);
  run();dispose();resolve([{projection:{pending:true}}]);await new Promise(r=>setImmediate(r));assert.deepEqual(events,[]);assert.equal(calls,1);
  watchProjection({listSites:async()=>{throw new StudioApiError('denied',403);}},callbacks,runtime);
  run();await new Promise(r=>setImmediate(r));assert.deepEqual(events,['unauthorized']);
});

test('hidden tabs do not poll metadata until visible',async()=>{
  const {watchProjection}=tsLoader()(new URL('../src/features/studio/watch-projection.ts',import.meta.url));
  let visible=false,run,calls=0;
  const dispose=watchProjection({listSites:async()=>{calls++;return[];}},{sites:()=>{},unavailable:()=>assert.fail('unexpected failure'),unauthorized:()=>assert.fail('unexpected denial')},
    {visible:()=>visible,schedule:fn=>{run=fn;return 1;},cancel:()=>{}});
  run();await new Promise(r=>setImmediate(r));assert.equal(calls,0);
  visible=true;run();await new Promise(r=>setImmediate(r));assert.equal(calls,1);dispose();
});
