import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { Miniflare,Log,LogLevel,convertV4MiniflareOptions } from 'miniflare';
import { buildPublicWorker } from '../../scripts/build-public-worker.mjs';
import { createD1Writer } from '../../scripts/lib/public-projector.mjs';

export const PUBLIC_ORIGIN='https://content.example.test';
export const STUDIO_ORIGIN='https://studio.example.org';
export async function publicWorkerRuntime(){
  const {code}=await buildPublicWorker();let egress=0;const writes=[];
  const emulator=new Miniflare(convertV4MiniflareOptions({modules:true,script:code,compatibilityDate:'2026-07-29',
    cf:false,inspectorPort:0,log:new Log(LogLevel.NONE),
    bindings:{PUBLIC_ORIGIN,STUDIO_ORIGIN},d1Databases:{PUBLIC_READ_MODEL:'public-worker-empty'},r2Buckets:{ASSETS:'public-worker-empty'},
    outboundService:async()=>{egress++;return new Response('Synthetic outbound blocked',{status:502});}}));
  const db=await emulator.getD1Database('PUBLIC_READ_MODEL'),bucket=await emulator.getR2Bucket('ASSETS');
  const migration=await readFile(new URL('../../cloudflare/read-model/migrations/0004_public_read_model.sql',import.meta.url),'utf8');
  const parser=new DatabaseSync(':memory:');let pending='';
  try{
    for(const line of migration.split('\n')){
      pending+=line+'\n';if(!line.trimEnd().endsWith(';'))continue;
      try{parser.exec(pending);}catch(error){if(error.message.includes('incomplete input'))continue;throw error;}
      await db.prepare(pending).run();pending='';
    }
    assert.equal(pending.trim(),'');
  }finally{parser.close();}
  const send=createD1Writer({accountId:'a'.repeat(32),databaseId:'00000000-0000-0000-0000-000000000036',token:'synthetic-projector-token-only',
    fetcher:async(_url,options)=>{const {batch}=JSON.parse(options.body);writes.push(batch);
      return Response.json({success:true,result:await db.batch(batch.map(item=>db.prepare(item.sql).bind(...item.params)))});}});
  const worker=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).default;
  return {db,bucket,send,writes,worker,egress:()=>egress,
    fetch:(url,options)=>emulator.dispatchFetch(url,options),close:()=>emulator.dispose()};
}
