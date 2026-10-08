-- Foundation schema only. No routes expose or mutate these tables before P2/P3.
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_identity text UNIQUE,
  role text NOT NULL CHECK (role IN ('employee', 'admin')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sites (
  id text PRIMARY KEY CHECK (id ~ '^[a-f0-9]{32}$'),
  owner_id uuid NOT NULL REFERENCES users(id),
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished', 'deleted')),
  active_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sites_owner_id_idx ON sites(owner_id);

CREATE TABLE site_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text NOT NULL REFERENCES sites(id),
  storage_prefix text NOT NULL UNIQUE,
  uploaded_by uuid NOT NULL REFERENCES users(id),
  manifest_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (site_id, id)
);
CREATE INDEX site_versions_site_id_idx ON site_versions(site_id);

-- The active version must belong to the same site.
ALTER TABLE sites ADD CONSTRAINT sites_active_version_fk
  FOREIGN KEY (id, active_version_id)
  REFERENCES site_versions(site_id, id);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES users(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_created_at_idx ON audit_events(created_at DESC);
