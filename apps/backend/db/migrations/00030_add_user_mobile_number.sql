-- +goose Up
ALTER TABLE users
    ADD COLUMN mobile_number VARCHAR(20);

-- +goose Down
ALTER TABLE users
    DROP COLUMN IF EXISTS mobile_number;
