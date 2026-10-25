import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('additive PostgreSQL migration preserves legacy published rows and does not enqueue a rebuild',async()=>{
  const db=await PGlite.create();
  try {
    for(const name of ['0001_initial_schema.sql','0002_auth_and_manifests.sql','0003_site_share_links.sql']) {
      await db.exec(await readFile(new URL('../db/migrations/'+name,import.meta.url),'utf8'));
    }
    const owner=(await db.query("INSERT INTO users(external_identity,role)VALUES('synthetic-legacy','employee')RETURNING id")).rows[0].id;
    const id='c'.repeat(32);
    await db.query("INSERT INTO sites(id,owner_id,display_name)VALUES($1,$2,'Legacy synthetic')",[id,owner]);
    await db.query("INSERT INTO site_share_links(code,site_id)VALUES('Legacy1234',$1)",[id]);
    const version='11111111-1111-4111-8111-111111111111';
    await db.query(`INSERT INTO site_versions(id,site_id,storage_prefix,uploaded_by,manifest_hash,asset_manifest)
      VALUES($1,$2,$3,$4,'synthetic',$5::jsonb)`,[version,id,id+'/'+version,owner,
      JSON.stringify([{path:'index.html',type:'text/html',size:12,sha256:'a'.repeat(64)}])]);
    await db.query("UPDATE sites SET status='published',active_version_id=$2 WHERE id=$1",[id,version]);
    const before=(await db.query('SELECT * FROM sites')).rows;
    const versionsBefore=(await db.query('SELECT * FROM site_versions')).rows;
    await db.exec(await readFile(new URL('../db/migrations/0004_public_projection_outbox.sql',import.meta.url),'utf8'));
    assert.deepEqual((await db.query('SELECT * FROM sites')).rows,before);
    assert.deepEqual((await db.query('SELECT * FROM site_versions')).rows,versionsBefore);
    assert.equal((await db.query('SELECT count(*)::int n FROM public_projection_outbox')).rows[0].n,0);
    const bound=(await db.query("SELECT max_value::text FROM pg_sequences WHERE sequencename='public_projection_outbox_id_seq'")).rows[0].max_value;
    assert.equal(bound,'9007199254740991');
  } finally {await db.close();}
});
