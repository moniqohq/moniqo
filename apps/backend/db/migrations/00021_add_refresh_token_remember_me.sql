-- +goose Up
ALTER TABLE refresh_tokens ADD COLUMN remember_me BOOLEAN NOT NULL DEFAULT true;

-- +goose Down
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS remember_me;
