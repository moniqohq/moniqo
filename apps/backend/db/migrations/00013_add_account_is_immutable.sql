-- +goose Up
ALTER TABLE accounts ADD COLUMN is_immutable BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE accounts DROP COLUMN IF EXISTS is_immutable;
