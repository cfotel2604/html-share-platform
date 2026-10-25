-- #36: one primary query per request. Path/ETag/size enforcement stays in the Worker.
SELECT site_id, active_version, manifest, projection_version, updated_at
FROM public_read_model
WHERE share_code = ? COLLATE BINARY AND status = 'published';
