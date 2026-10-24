-- Contract for #33/#34: bind only public data, in this order. No request handler calls this.
INSERT INTO public_read_model
  (share_code, site_id, status, active_version, manifest, projection_version, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(share_code) DO UPDATE SET
  status = excluded.status,
  active_version = excluded.active_version,
  manifest = excluded.manifest,
  projection_version = excluded.projection_version,
  updated_at = excluded.updated_at
WHERE excluded.projection_version > public_read_model.projection_version
  AND excluded.site_id = public_read_model.site_id
  AND (public_read_model.status <> 'revoked' OR excluded.status = 'revoked');
