-- +goose Up
-- OIDC-only accounts have no password credential. NULL is the honest signal
-- for "no password set" -- a placeholder hash would be a landmine that looks
-- like a real credential.
ALTER TABLE users ALTER COLUMN hash DROP NOT NULL;

-- +goose Down
-- Cannot safely restore NOT NULL once OIDC-only rows (hash IS NULL) exist;
-- deliberately not attempting to backfill a fake hash on downgrade.
ALTER TABLE users ALTER COLUMN hash SET NOT NULL;
