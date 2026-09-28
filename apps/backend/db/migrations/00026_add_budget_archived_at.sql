-- +goose Up
ALTER TABLE budgets ADD COLUMN archived_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE budgets DROP COLUMN IF EXISTS archived_at;
