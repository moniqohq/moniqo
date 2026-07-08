-- +goose Up
CREATE TYPE transaction_status AS ENUM ('uncleared', 'cleared', 'reconciled');

ALTER TABLE transactions
    ADD COLUMN status transaction_status NOT NULL DEFAULT 'uncleared';

ALTER TABLE accounts
    ADD COLUMN last_reconciled_at TIMESTAMPTZ;

CREATE INDEX transactions_account_cleared_idx
    ON transactions (account_id, budget_id) WHERE status <> 'uncleared' AND deleted_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS transactions_account_cleared_idx;

ALTER TABLE accounts
    DROP COLUMN IF EXISTS last_reconciled_at;

ALTER TABLE transactions
    DROP COLUMN IF EXISTS status;

DROP TYPE IF EXISTS transaction_status;
