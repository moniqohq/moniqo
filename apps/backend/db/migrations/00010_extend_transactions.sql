-- +goose Up
ALTER TABLE transactions
    ADD COLUMN date                TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN transfer_account_id BIGINT      REFERENCES accounts(id),
    ADD COLUMN transfer_group_id   UUID;

ALTER TABLE transactions
    ADD CONSTRAINT transactions_amount_nonzero
        CHECK (amount <> 0),
    ADD CONSTRAINT transactions_transfer_envelope_exclusive
        CHECK (transfer_account_id IS NULL OR envelope_id IS NULL),
    ADD CONSTRAINT transactions_no_self_transfer
        CHECK (transfer_account_id IS NULL OR transfer_account_id <> account_id);

CREATE INDEX transactions_budget_date_idx
    ON transactions (budget_id, date DESC) WHERE deleted_at IS NULL;

CREATE INDEX transactions_transfer_group_idx
    ON transactions (transfer_group_id) WHERE transfer_group_id IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS transactions_transfer_group_idx;
DROP INDEX IF EXISTS transactions_budget_date_idx;

ALTER TABLE transactions
    DROP CONSTRAINT IF EXISTS transactions_no_self_transfer,
    DROP CONSTRAINT IF EXISTS transactions_transfer_envelope_exclusive,
    DROP CONSTRAINT IF EXISTS transactions_amount_nonzero;

ALTER TABLE transactions
    DROP COLUMN IF EXISTS transfer_group_id,
    DROP COLUMN IF EXISTS transfer_account_id,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS date;
