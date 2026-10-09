-- Viewer codes are independent of immutable content host IDs.
-- Revoked rows remain reserved so old links can never point at another site.
CREATE TABLE site_share_links (
  code text COLLATE "C" PRIMARY KEY CHECK (code ~ '^[A-Za-z0-9]{10}$'),
  site_id text NOT NULL REFERENCES sites(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX site_share_links_one_active_idx
  ON site_share_links(site_id) WHERE revoked_at IS NULL;
CREATE INDEX site_share_links_site_idx ON site_share_links(site_id);
