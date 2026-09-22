-- +goose Up
-- Supports the accounts JOIN added to ListTransactions/CountTransactions and the
-- other transaction/envelope aggregate queries that now filter out archived
-- accounts: lets the planner narrow to active accounts before joining transactions.
CREATE INDEX accounts_budget_active_idx ON accounts (budget_id, id) WHERE deleted_at IS NULL AND archived_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS accounts_budget_active_idx;
