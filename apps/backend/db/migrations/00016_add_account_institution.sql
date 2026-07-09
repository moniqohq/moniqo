-- +goose Up
ALTER TABLE accounts ADD COLUMN institution VARCHAR(128);

-- +goose Down
ALTER TABLE accounts DROP COLUMN IF EXISTS institution;
