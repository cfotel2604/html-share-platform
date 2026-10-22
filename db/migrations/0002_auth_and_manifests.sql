-- Additive migration. Keep 0001 and its checksum unchanged.
ALTER TABLE users ADD COLUMN email text;
CREATE TABLE auth_allowlist (
  email text PRIMARY KEY CHECK (email = lower(trim(email)) AND length(email) <= 254),
  role text NOT NULL CHECK (role IN ('employee', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- NULL legacy manifests fail closed at the gateway until verified backfill.
ALTER TABLE site_versions ADD COLUMN asset_manifest jsonb;
CREATE TABLE preview_grants (
  token_hash text PRIMARY KEY,
  site_id text NOT NULL,
  version_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL,
  FOREIGN KEY (site_id, version_id) REFERENCES site_versions(site_id, id)
);
CREATE INDEX preview_grants_expiry_idx ON preview_grants(expires_at);
