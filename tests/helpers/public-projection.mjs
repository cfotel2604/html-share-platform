import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from 'miniflare';
import { createD1Writer } from '../../scripts/lib/public-projector.mjs';
import { tsLoader } from './load-ts.mjs';

export async function migrateEmpty(database) {
  const directory = new URL('../../db/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    await database.exec(await readFile(new URL(name,directory),'utf8'));
  }
}
export async function localPostgres({dataDir,initialize=true}={}) {
  const database = await PGlite.create(dataDir?{dataDir}:{});
  if(initialize)await migrateEmpty(database);
  const query = async (sql, params) => {
    const result = await database.query(sql,params);
    return { ...result, rowCount: result.rows.length || result.affectedRows || 0 };
  };
  const pool = { query, connect: async () => ({query,release() {}}) };
  return { database, pool, close: () => database.close() };
}
export async function localD1() {
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: 'export default { fetch() { return new Response(null,{status:404}); } };',
    compatibilityDate:'2026-07-29',inspectorPort:0,log:new Log(LogLevel.NONE),d1Databases:{MODEL:'outbox-empty-test'},
  }));
  const db = await mf.getD1Database('MODEL');
  const sql = await readFile(new URL('../../cloudflare/read-model/migrations/0004_public_read_model.sql',import.meta.url),'utf8');
  const parser = new DatabaseSync(':memory:'); let pending='';
  try {
    for (const line of sql.split('\n')) {
      pending+=line+'\n'; if(!line.trimEnd().endsWith(';')) continue;
      try { parser.exec(pending); } catch(error) { if(error.message.includes('incomplete input')) continue; throw error; }
      await db.prepare(pending).run(); pending='';
    }
    assert.equal(pending.trim(),'');
  } finally { parser.close(); }
  const calls=[], history=[], reads=[];
  let failure;
  const fetcher=async (_url,options) => {
    const request=JSON.parse(options.body);
    const read=request.batch.every(item=>item.sql.trimStart().startsWith('SELECT'));
    (read?reads:calls).push(request);
    if (failure) return failure();
    const result=await db.batch(request.batch.map(item=>db.prepare(item.sql).bind(...item.params)));
    if(!read)history.push(request.batch.map(item=>({code:item.params[0],status:item.params[2],version:item.params[5]})));
    return Response.json({success:true,result});
  };
  const send=createD1Writer({accountId:'a'.repeat(32),databaseId:'00000000-0000-0000-0000-000000000033',token:'synthetic-projector-token-only',fetcher});
  return {db,send,calls,reads,history,fail:handler=>{failure=handler;},close:()=>mf.dispose()};
}

export async function seedActor(pool, suffix='one', role='employee') {
  const email=`synthetic-${suffix}@example.test`;
  await pool.query("INSERT INTO auth_allowlist(email,role) VALUES($1,$2)",[email,role]);
  return (await pool.query("INSERT INTO users(external_identity,email,role) VALUES($1,$2,$3) RETURNING id,role",['clerk:synthetic-'+suffix,email,role])).rows[0];
}
export function nodeServices(pool) {
  const objects=new Map();
  const s3={send:async command=>{
    const input=command.input;
    switch(command.constructor.name) {
      case 'HeadBucketCommand': return {};
      case 'PutObjectCommand': {
        assert.equal(input.IfNoneMatch,'*');assert.ok(!objects.has(input.Key));
        const etag='"'+createHash('md5').update(input.Body).digest('hex')+'"';
        objects.set(input.Key,{body:input.Body,etag});return {ETag:etag};
      }
      case 'GetObjectCommand': {
        const object=objects.get(input.Key);assert.equal(input.IfMatch,object.etag);
        return {ETag:object.etag,ContentLength:object.body.length,Body:Readable.from([object.body])};
      }
      case 'DeleteObjectsCommand': for(const item of input.Delete.Objects)objects.delete(item.Key);return {};
      default: throw new Error('Unexpected synthetic storage command');
    }
  }};
  const load=tsLoader({'./db':{db:()=>pool}});
  const ops=load(new URL('../../src/lib/site-ops.ts',import.meta.url));
  const links=load(new URL('../../src/lib/share-links.ts',import.meta.url));
  const run=async callback=>{
    const old=globalThis.__htmlShareS3;globalThis.__htmlShareS3=s3;
    try{return await callback();}finally{if(old)globalThis.__htmlShareS3=old;else delete globalThis.__htmlShareS3;}
  };
  return {ops,links,run,objects};
}
