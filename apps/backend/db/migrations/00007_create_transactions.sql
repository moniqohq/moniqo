-- +goose Up
-- Minimal transactions table for M3 balance calculation.
-- Full Transaction Engine (M4) will extend this with payee, envelope, cleared, etc.
CREATE TABLE transactions (
    id         BIGSERIAL   PRIMARY KEY,
    budget_id  BIGINT      NOT NULL REFERENCES budgets(id),
    account_id BIGINT      NOT NULL REFERENCES accounts(id),
    amount     BIGINT      NOT NULL,
    memo       TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX transactions_account_budget_idx ON transactions (account_id, budget_id) WHERE deleted_at IS NULL;

-- +goose Down
DROP TABLE IF EXISTS transactions;
