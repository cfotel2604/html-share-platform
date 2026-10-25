-- cleanup_at records a successful sweep, not proof that no late PUT can arrive.
-- Keep aborted intent tombstones eligible for bounded resweeps indefinitely.
ALTER TABLE upload_intents ADD COLUMN cleanup_after TEXT;
UPDATE upload_intents SET cleanup_after=COALESCE(cleanup_at,'1970-01-01T00:00:00.000Z') WHERE state='aborted';
CREATE INDEX intents_cleanup_schedule ON upload_intents(COALESCE(cleanup_after,expires_at)) WHERE state IN ('open','aborted');
