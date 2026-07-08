-- +goose Up
ALTER TABLE accounts ADD COLUMN account_number VARCHAR(64);

-- +goose Down
ALTER TABLE accounts DROP COLUMN IF EXISTS account_number;
