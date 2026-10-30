-- +goose Up
CREATE TABLE reconciliation_checkpoints (
    id                    BIGSERIAL PRIMARY KEY,
    budget_id             BIGINT NOT NULL REFERENCES budgets(id),
    account_id            BIGINT NOT NULL REFERENCES accounts(id),
    statement_balance     BIGINT NOT NULL,
    statement_date        DATE   NOT NULL,
    cleared_balance       BIGINT NOT NULL,
    ledger_balance        BIGINT NOT NULL,
    difference            BIGINT NOT NULL,
    transactions_count    INT    NOT NULL DEFAULT 0,
    reconciled_by_user_id BIGINT REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ
);

CREATE INDEX reconciliation_checkpoints_account_idx
    ON reconciliation_checkpoints (account_id, budget_id, created_at DESC)
    WHERE deleted_at IS NULL;

-- +goose Down
DROP TABLE reconciliation_checkpoints;
