-- Independent pilot schema. Never apply to the existing PostgreSQL lab.
CREATE TABLE auth_allowlist (
 email TEXT PRIMARY KEY CHECK(email=lower(trim(email))),
 role TEXT NOT NULL CHECK(role IN ('employee','admin')),
 status TEXT NOT NULL CHECK(status IN ('active','disabled'))
);
CREATE TABLE users (
 id TEXT PRIMARY KEY, external_identity TEXT NOT NULL UNIQUE, email TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled'))
);
CREATE TABLE sites (
 id TEXT PRIMARY KEY CHECK(length(id)=32 AND id NOT GLOB '*[^a-f0-9]*'),
 owner_id TEXT NOT NULL REFERENCES users(id), display_name TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('draft','published','unpublished','deleted')),
 active_version_id TEXT, revision INTEGER NOT NULL DEFAULT 0,
 updated_at TEXT NOT NULL,
 FOREIGN KEY(id,active_version_id) REFERENCES site_versions(site_id,id)
);
CREATE INDEX sites_owner ON sites(owner_id);
CREATE TABLE site_versions (
 id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES sites(id),
 storage_prefix TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
 UNIQUE(site_id,id)
);
CREATE TABLE version_assets (
 version_id TEXT NOT NULL REFERENCES site_versions(id), path TEXT NOT NULL,
 type TEXT NOT NULL, size INTEGER NOT NULL CHECK(size>=0 AND size<=104857600),
 sha256 TEXT NOT NULL CHECK(length(sha256)=64), etag TEXT NOT NULL,
 PRIMARY KEY(version_id,path)
);
CREATE TABLE site_share_links (
 code TEXT COLLATE BINARY PRIMARY KEY CHECK(length(code)=10 AND code NOT GLOB '*[^A-Za-z0-9]*'),
 site_id TEXT NOT NULL REFERENCES sites(id), revoked_at TEXT
);
CREATE UNIQUE INDEX one_active_code ON site_share_links(site_id) WHERE revoked_at IS NULL;
CREATE TABLE upload_intents (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
 site_id TEXT NOT NULL REFERENCES sites(id), version_id TEXT NOT NULL UNIQUE,
 expected_revision INTEGER NOT NULL, display_name TEXT NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('open','finalized','aborted')),
 expires_at TEXT NOT NULL
);
CREATE INDEX intents_expiry ON upload_intents(state,expires_at);
CREATE TABLE preview_grants (
 token_hash TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
 site_id TEXT NOT NULL, version_id TEXT NOT NULL, expires_at TEXT NOT NULL,
 FOREIGN KEY(site_id,version_id) REFERENCES site_versions(site_id,id)
);
CREATE INDEX grants_expiry ON preview_grants(expires_at);
CREATE TABLE audit_events (
 id TEXT PRIMARY KEY, actor_id TEXT NOT NULL REFERENCES users(id),
 action TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE mutation_receipts (
 actor_id TEXT NOT NULL REFERENCES users(id), key TEXT NOT NULL,
 action TEXT NOT NULL, body_hash TEXT NOT NULL, response_json TEXT NOT NULL,
 created_at TEXT NOT NULL, PRIMARY KEY(actor_id,key)
);
-- An unsuccessful guard must throw before any following batch writes.
CREATE TABLE mutation_checks (id TEXT PRIMARY KEY, ok INTEGER NOT NULL CHECK(ok=1));
