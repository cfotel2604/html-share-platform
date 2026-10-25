import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

const modelSql=readFileSync(new URL('../cloudflare/read-model/migrations/0004_public_read_model.sql',import.meta.url),'utf8');
const retirement=readFileSync(new URL('../cloudflare/read-model/migrations/0005_retire_pilot_legacy.sql',import.meta.url),'utf8');
const resolve=readFileSync(new URL('../cloudflare/read-model/queries/resolve.sql',import.meta.url),'utf8');
const legacy=['audit_events','auth_allowlist','mutation_checks','mutation_receipts','preview_grants','site_share_links','site_versions','sites','upload_intents','users','version_assets'].sort();
function fixture(){
  const db=new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON;');db.exec(modelSql);
  db.exec(`CREATE TABLE d1_migrations(id INTEGER PRIMARY KEY,name TEXT);INSERT INTO d1_migrations VALUES(4,'0004_public_read_model.sql');
    CREATE TABLE unrelated(id TEXT PRIMARY KEY);INSERT INTO unrelated VALUES('keep');
    CREATE TABLE users(id TEXT PRIMARY KEY);
    CREATE TABLE sites(id TEXT PRIMARY KEY,owner_id TEXT REFERENCES users(id),active_version_id TEXT,
      FOREIGN KEY(id,active_version_id) REFERENCES site_versions(site_id,id));
    CREATE TABLE site_versions(id TEXT PRIMARY KEY,site_id TEXT REFERENCES sites(id),UNIQUE(site_id,id));
    CREATE TABLE version_assets(version_id TEXT REFERENCES site_versions(id),path TEXT);
    BEGIN; PRAGMA defer_foreign_keys=ON;
    INSERT INTO users VALUES('actor');INSERT INTO sites VALUES('site','actor','version');
    INSERT INTO site_versions VALUES('version','site');INSERT INTO version_assets VALUES('version','index.html');COMMIT;`);
  for(const name of legacy.filter(name=>!['users','sites','site_versions','version_assets'].includes(name))){
    db.exec(`CREATE TABLE ${name}(id TEXT PRIMARY KEY,site_id TEXT REFERENCES sites(id));INSERT INTO ${name} VALUES('legacy','site');`);
  }
  const insert=db.prepare('INSERT INTO public_read_model VALUES(?,?,?,?,?,?,?)');
  const version='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  insert.run('Aa00000001','a'.repeat(32),'published',version,JSON.stringify([{path:'index.html',r2_key:`${'a'.repeat(32)}/${version}/index.html`,size:1,etag:'c'.repeat(32)}]),1,'2026-10-24T00:00:00.000Z');
  insert.run('Aa00000002','a'.repeat(32),'revoked',null,'[]',2,'2026-10-24T00:00:01.000Z');
  return db;
}
function apply(db){db.exec('BEGIN;');try{db.exec(retirement);db.exec('COMMIT;');}catch(error){db.exec('ROLLBACK;');throw error;}}
const snapshot=db=>db.prepare('SELECT * FROM public_read_model ORDER BY share_code').all();

test('legacy retirement has a closed pilot-only table allowlist and no public model mutation',()=>{
  const drops=[...retirement.matchAll(/DROP TABLE IF EXISTS (\w+);/g)].map(match=>match[1]).sort();
  assert.deepEqual(drops,legacy);
  assert.doesNotMatch(retirement,/\b(?:DELETE|UPDATE|INSERT|REPLACE|ALTER|DROP TRIGGER|foreign_keys\s*=\s*OFF)\b/i);
});
test('retirement removes cyclic legacy rows/tables atomically and preserves published assets, tombstones and guards',()=>{
  const db=fixture();try{
    const before=snapshot(db),lookup=db.prepare(resolve).get('Aa00000001');
    apply(db);assert.deepEqual(snapshot(db),before);assert.deepEqual(db.prepare(resolve).get('Aa00000001'),lookup);
    for(const name of legacy)assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sqlite_schema WHERE name=?').get(name).n,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM d1_migrations').get().n,1);
    assert.equal(db.prepare('SELECT id FROM unrelated').get().id,'keep');
    assert.throws(()=>db.exec("UPDATE public_read_model SET status='unpublished',projection_version=3 WHERE share_code='Aa00000002'"));
    assert.throws(()=>db.exec('DELETE FROM public_read_model'));
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{db.close();}
});
test('retirement is harmless on an empty/fresh model and replay never changes public state',()=>{
  const db=new DatabaseSync(':memory:');try{db.exec('PRAGMA foreign_keys=ON;');db.exec(modelSql);apply(db);apply(db);assert.deepEqual(snapshot(db),[]);}finally{db.close();}
});
test('unexpected dependent table blocks retirement and transaction rollback retains all legacy/public rows',()=>{
  const db=fixture();try{
    db.exec("CREATE TABLE unexpected(id TEXT REFERENCES users(id));INSERT INTO unexpected VALUES('actor');");
    const before=snapshot(db);assert.throws(()=>apply(db));assert.deepEqual(snapshot(db),before);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM version_assets').get().n,1);
  }finally{db.close();}
});
