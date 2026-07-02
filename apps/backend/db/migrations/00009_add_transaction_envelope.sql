-- +goose Up
ALTER TABLE transactions ADD COLUMN envelope_id BIGINT REFERENCES envelopes(id);

CREATE INDEX transactions_envelope_budget_idx ON transactions (envelope_id, budget_id) WHERE deleted_at IS NULL AND envelope_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS transactions_envelope_budget_idx;
ALTER TABLE transactions DROP COLUMN IF EXISTS envelope_id;
