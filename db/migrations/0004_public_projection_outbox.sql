-- PostgreSQL only. D1 migration0004 and PostgreSQL0001-0003 remain unchanged.
-- Allocation happens under the site row lock, preserving per-site commit order.
CREATE TABLE public_projection_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY (MAXVALUE 9007199254740991) PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id),
  source_tx bigint NOT NULL DEFAULT txid_current(),
  changed_codes text[] NOT NULL,
  priority boolean NOT NULL DEFAULT false,
  has_revoke boolean NOT NULL DEFAULT false,
  payload jsonb,
  enqueued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','projected')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT '-infinity',
  last_attempt_at timestamptz,
  last_error text CHECK (last_error ~ '^[a-z0-9_]{1,64}$'),
  projected_at timestamptz,
  UNIQUE (site_id, source_tx),
  CHECK ((state='pending' AND projected_at IS NULL) OR (state='projected' AND projected_at IS NOT NULL))
);
CREATE INDEX public_projection_pending_order ON public_projection_outbox(id) WHERE state='pending';
CREATE INDEX public_projection_pending_site ON public_projection_outbox(site_id,id) WHERE state='pending';
CREATE INDEX public_projection_revoke_age ON public_projection_outbox(enqueued_at) WHERE state='pending' AND has_revoke;

-- Shared across all projector processes using this source database. No token here.
CREATE TABLE public_projection_control (
  id integer PRIMARY KEY CHECK(id=1),
  target_fingerprint text CHECK(target_fingerprint ~ '^[a-f0-9]{64}$'),
  next_request_at timestamptz NOT NULL DEFAULT '-infinity'
);
INSERT INTO public_projection_control(id) VALUES(1);

CREATE FUNCTION capture_public_projection() RETURNS trigger LANGUAGE plpgsql
SET search_path=public,pg_temp AS $$
DECLARE
  target text;
  codes text[];
  urgent boolean;
BEGIN
  IF TG_TABLE_NAME='sites' THEN
    target := NEW.id;
    IF NEW.status IS NOT DISTINCT FROM OLD.status
      AND NEW.active_version_id IS NOT DISTINCT FROM OLD.active_version_id THEN RETURN NEW; END IF;
    SELECT array_agg(code ORDER BY code COLLATE "C") INTO codes
      FROM site_share_links WHERE site_id=target AND revoked_at IS NULL;
    urgent := NEW.status<>'published';
  ELSE
    target := NEW.site_id;
    codes := ARRAY[NEW.code];
    urgent := NEW.revoked_at IS NOT NULL;
    IF TG_OP='UPDATE' AND (NEW.site_id IS DISTINCT FROM OLD.site_id OR NEW.code IS DISTINCT FROM OLD.code
      OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NULL)) THEN
      RAISE EXCEPTION 'share link identity and tombstones are permanent';
    END IF;
    IF TG_OP='UPDATE' AND NEW.revoked_at IS NOT DISTINCT FROM OLD.revoked_at THEN RETURN NEW; END IF;
  END IF;
  -- Existing application/operator mutations already lock the site first. The
  -- trigger also serializes direct SQL changes; deadlock victims roll back normally.
  PERFORM id FROM sites WHERE id=target FOR UPDATE;
  IF coalesce(cardinality(codes),0)=0 THEN RETURN NEW; END IF;
  INSERT INTO public_projection_outbox(site_id,changed_codes,priority)
    VALUES(target,codes,urgent)
    ON CONFLICT(site_id,source_tx) DO UPDATE SET
      changed_codes=ARRAY(SELECT DISTINCT code FROM unnest(public_projection_outbox.changed_codes || EXCLUDED.changed_codes) AS entries(code) ORDER BY code),
      priority=public_projection_outbox.priority OR EXCLUDED.priority;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sites_public_projection AFTER UPDATE OF status,active_version_id ON sites
  FOR EACH ROW EXECUTE FUNCTION capture_public_projection();
CREATE TRIGGER links_public_projection AFTER INSERT OR UPDATE ON site_share_links
  FOR EACH ROW EXECUTE FUNCTION capture_public_projection();

CREATE FUNCTION retain_public_link_tombstone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'share link rows must be retained as tombstones'; END;
$$;
CREATE TRIGGER retain_public_link_tombstone BEFORE DELETE ON site_share_links
  FOR EACH ROW EXECUTE FUNCTION retain_public_link_tombstone();

CREATE FUNCTION finalize_public_projection() RETURNS trigger LANGUAGE plpgsql
SET search_path=public,pg_temp AS $$
DECLARE
  event public_projection_outbox%ROWTYPE;
  site sites%ROWTYPE;
  version site_versions%ROWTYPE;
  assets jsonb;
  snapshot jsonb;
  stamp text;
BEGIN
  SELECT * INTO STRICT event FROM public_projection_outbox WHERE id=NEW.id;
  IF event.source_tx<>txid_current() THEN RAISE EXCEPTION 'public event snapshot is immutable after source commit'; END IF;
  SELECT * INTO STRICT site FROM sites WHERE id=event.site_id;
  IF cardinality(event.changed_codes)>100 THEN RAISE EXCEPTION 'public transaction exceeds projection batch bound'; END IF;
  IF site.status='published' AND EXISTS (
    SELECT 1 FROM site_share_links WHERE site_id=site.id AND code=ANY(event.changed_codes) AND revoked_at IS NULL
  ) THEN
    SELECT * INTO STRICT version FROM site_versions WHERE site_id=site.id AND id=site.active_version_id;
    IF jsonb_typeof(version.asset_manifest) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'published version requires verified manifest';
    END IF;
    IF jsonb_array_length(version.asset_manifest) NOT BETWEEN 1 AND 500 OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(version.asset_manifest) AS a
      WHERE jsonb_typeof(a->'path') IS DISTINCT FROM 'string' OR length(a->>'path')=0
        OR jsonb_typeof(a->'size') IS DISTINCT FROM 'number'
        OR coalesce(a->>'etag','') !~ '^[A-Za-z0-9-]{1,128}$'
    ) THEN RAISE EXCEPTION 'published version requires verified manifest'; END IF;
    SELECT jsonb_agg(jsonb_build_object('path',a->>'path','r2_key',version.storage_prefix || '/' || (a->>'path'),
      'size',(a->>'size')::bigint,'etag',a->>'etag') ORDER BY a->>'path') INTO assets
      FROM jsonb_array_elements(version.asset_manifest) AS a;
    IF (SELECT count(*) FROM jsonb_array_elements(assets) AS a WHERE a->>'path'='index.html')<>1
      OR (SELECT count(DISTINCT a->>'path') FROM jsonb_array_elements(assets) AS a)<>jsonb_array_length(assets)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(assets) AS a WHERE (a->>'size')::bigint NOT BETWEEN 0 AND 104857600)
      OR (SELECT sum((a->>'size')::bigint) FROM jsonb_array_elements(assets) AS a)>104857600 THEN
      RAISE EXCEPTION 'published version requires verified manifest';
    END IF;
  END IF;
  stamp := to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  SELECT jsonb_agg(jsonb_build_object(
    'share_code',l.code,'site_id',site.id,
    'status',CASE WHEN l.revoked_at IS NOT NULL OR site.status='deleted' THEN 'revoked'
      WHEN site.status='published' THEN 'published' ELSE 'unpublished' END,
    'active_version',CASE WHEN l.revoked_at IS NULL AND site.status='published' THEN site.active_version_id::text ELSE NULL END,
    'manifest',CASE WHEN l.revoked_at IS NULL AND site.status='published' THEN assets ELSE '[]'::jsonb END,
    'projection_version',event.id,'updated_at',stamp
  ) ORDER BY (l.revoked_at IS NOT NULL) DESC,l.code COLLATE "C") INTO snapshot
    FROM site_share_links AS l WHERE l.site_id=site.id AND l.code=ANY(event.changed_codes);
  IF jsonb_array_length(coalesce(snapshot,'[]'::jsonb))<>cardinality(event.changed_codes) THEN
    RAISE EXCEPTION 'public code identity missing at commit';
  END IF;
  UPDATE public_projection_outbox SET payload=snapshot,enqueued_at=clock_timestamp(),
    has_revoke=EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot) AS item WHERE item->>'status'='revoked') WHERE id=event.id;
  RETURN NULL;
END;
$$;

-- One snapshot per site/transaction. This fires after the final manifest/audit
-- writes, while still in the source transaction; any failure rolls back both.
CREATE CONSTRAINT TRIGGER finalize_public_projection AFTER INSERT OR UPDATE OF changed_codes ON public_projection_outbox
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finalize_public_projection();
