-- ADR-0006 / #32. Self-contained, additive successor to pilot D1 0001-0003.
-- Never copy the legacy management schema into a fresh read-model database.
CREATE TABLE public_read_model (
  share_code TEXT COLLATE BINARY PRIMARY KEY NOT NULL
    CHECK(length(share_code) = 10 AND share_code NOT GLOB '*[^A-Za-z0-9]*'),
  site_id TEXT NOT NULL
    CHECK(length(site_id) = 32 AND site_id NOT GLOB '*[^a-f0-9]*'),
  status TEXT NOT NULL CHECK(status IN ('published', 'unpublished', 'revoked')),
  active_version TEXT,
  manifest TEXT NOT NULL CHECK(CASE WHEN json_valid(manifest)
    THEN json_type(manifest) = 'array' AND json_array_length(manifest) <= 500 ELSE 0 END),
  projection_version INTEGER NOT NULL
    CHECK(projection_version > 0 AND projection_version <= 9007199254740991),
  updated_at TEXT NOT NULL CHECK(
    strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) IS NOT NULL
    AND strftime('%Y-%m-%dT%H:%M:%fZ', updated_at) = updated_at),
  CHECK((status = 'published' AND active_version IS NOT NULL AND length(active_version) > 0)
    OR (status <> 'published' AND active_version IS NULL AND manifest = '[]'))
) STRICT;

-- Silent no-op for replay, including callers that accidentally omit the UPSERT guard.
CREATE TRIGGER public_read_model_ignore_stale BEFORE UPDATE ON public_read_model
WHEN NEW.projection_version <= OLD.projection_version
BEGIN
  SELECT RAISE(IGNORE);
END;

CREATE TRIGGER public_read_model_keep_identity BEFORE UPDATE ON public_read_model
WHEN NEW.projection_version > OLD.projection_version
  AND (NEW.share_code <> OLD.share_code OR NEW.site_id <> OLD.site_id
    OR (OLD.status = 'revoked' AND NEW.status <> 'revoked'))
BEGIN
  SELECT RAISE(ABORT, 'read model identity and revoked tombstones are permanent');
END;

CREATE TRIGGER public_read_model_no_delete BEFORE DELETE ON public_read_model
BEGIN
  SELECT RAISE(ABORT, 'read model rows must be retained as tombstones');
END;

-- The manifest is a closed list of public asset fields, not an arbitrary JSON payload.
-- Keep INSERT/UPDATE validation identical; no PII or management metadata is accepted.
CREATE TRIGGER public_read_model_manifest_insert BEFORE INSERT ON public_read_model
WHEN NEW.status = 'published'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.manifest) AS asset
    WHERE asset.type <> 'object'
      OR (SELECT count(*) FROM json_each(asset.value)) <> 4
      OR EXISTS (SELECT 1 FROM json_each(asset.value)
        WHERE key NOT IN ('path', 'r2_key', 'size', 'etag'))
      OR json_type(asset.value, '$.path') IS NOT 'text'
      OR length(json_extract(asset.value, '$.path')) = 0
      OR json_type(asset.value, '$.r2_key') IS NOT 'text'
      OR length(json_extract(asset.value, '$.r2_key')) = 0
      OR json_type(asset.value, '$.size') IS NOT 'integer'
      OR json_extract(asset.value, '$.size') NOT BETWEEN 0 AND 104857600
      OR json_type(asset.value, '$.etag') IS NOT 'text'
      OR length(json_extract(asset.value, '$.etag')) = 0
  ) OR (SELECT count(*) FROM json_each(NEW.manifest)
    WHERE json_extract(value, '$.path') = 'index.html') <> 1
    OR (SELECT count(DISTINCT json_extract(value, '$.path')) FROM json_each(NEW.manifest))
      <> json_array_length(NEW.manifest)
    OR (SELECT sum(json_extract(value, '$.size')) FROM json_each(NEW.manifest)) > 104857600
  THEN RAISE(ABORT, 'invalid public asset manifest') END;
END;

CREATE TRIGGER public_read_model_manifest_update BEFORE UPDATE OF manifest, status ON public_read_model
WHEN NEW.status = 'published' AND NEW.projection_version > OLD.projection_version
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.manifest) AS asset
    WHERE asset.type <> 'object'
      OR (SELECT count(*) FROM json_each(asset.value)) <> 4
      OR EXISTS (SELECT 1 FROM json_each(asset.value)
        WHERE key NOT IN ('path', 'r2_key', 'size', 'etag'))
      OR json_type(asset.value, '$.path') IS NOT 'text'
      OR length(json_extract(asset.value, '$.path')) = 0
      OR json_type(asset.value, '$.r2_key') IS NOT 'text'
      OR length(json_extract(asset.value, '$.r2_key')) = 0
      OR json_type(asset.value, '$.size') IS NOT 'integer'
      OR json_extract(asset.value, '$.size') NOT BETWEEN 0 AND 104857600
      OR json_type(asset.value, '$.etag') IS NOT 'text'
      OR length(json_extract(asset.value, '$.etag')) = 0
  ) OR (SELECT count(*) FROM json_each(NEW.manifest)
    WHERE json_extract(value, '$.path') = 'index.html') <> 1
    OR (SELECT count(DISTINCT json_extract(value, '$.path')) FROM json_each(NEW.manifest))
      <> json_array_length(NEW.manifest)
    OR (SELECT sum(json_extract(value, '$.size')) FROM json_each(NEW.manifest)) > 104857600
  THEN RAISE(ABORT, 'invalid public asset manifest') END;
END;
