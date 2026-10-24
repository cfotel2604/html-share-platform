-- Owner-authorized pilot legacy retirement / #38.
-- Apply only after Packet A, writer retirement and a fresh target/model recheck.
-- Never reapply 0004. Public read model, its triggers, and migration ledger remain.
PRAGMA defer_foreign_keys = ON;

DROP TABLE IF EXISTS version_assets;
DROP TABLE IF EXISTS preview_grants;
DROP TABLE IF EXISTS audit_events;
DROP TABLE IF EXISTS mutation_receipts;
DROP TABLE IF EXISTS upload_intents;
DROP TABLE IF EXISTS site_share_links;
DROP TABLE IF EXISTS site_versions;
DROP TABLE IF EXISTS sites;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS auth_allowlist;
DROP TABLE IF EXISTS mutation_checks;
