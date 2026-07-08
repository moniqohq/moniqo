-- +goose Up
ALTER TABLE accounts ADD COLUMN archived_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE accounts DROP COLUMN IF EXISTS archived_at;
