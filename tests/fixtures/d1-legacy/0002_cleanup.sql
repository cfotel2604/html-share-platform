-- Separate housekeeping identity: never impersonate the employee in system audit.
INSERT INTO users(id,external_identity,email,status) VALUES('system:cleanup','system:cleanup','cleanup@invalid','disabled');
ALTER TABLE upload_intents ADD COLUMN cleanup_at TEXT;
