-- +goose Up
CREATE TYPE account_type AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'LOAN');

CREATE TABLE accounts (
    id             BIGSERIAL    PRIMARY KEY,
    budget_id      BIGINT       NOT NULL REFERENCES budgets(id),
    name           VARCHAR(255) NOT NULL,
    type           account_type NOT NULL,
    requires_recon BOOLEAN      NOT NULL DEFAULT FALSE,
    is_on_budget   BOOLEAN      NOT NULL DEFAULT TRUE,
    notes          TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ
);

-- Enforce name uniqueness per budget among active (non-deleted) accounts.
CREATE UNIQUE INDEX accounts_budget_name_active_key ON accounts (budget_id, lower(name)) WHERE deleted_at IS NULL;

CREATE INDEX accounts_budget_id_idx ON accounts (budget_id);

-- +goose Down
DROP TABLE IF EXISTS accounts;
DROP TYPE IF EXISTS account_type;
