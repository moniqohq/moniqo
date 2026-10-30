-- name: CreateCheckpoint :one
INSERT INTO reconciliation_checkpoints (
    budget_id, account_id, statement_balance, statement_date,
    cleared_balance, ledger_balance, difference, transactions_count, reconciled_by_user_id
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, budget_id, account_id, statement_balance, statement_date, cleared_balance, ledger_balance, difference, transactions_count, reconciled_by_user_id, created_at, deleted_at;

-- name: ListCheckpointsByAccount :many
SELECT id, budget_id, account_id, statement_balance, statement_date, cleared_balance, ledger_balance, difference, transactions_count, reconciled_by_user_id, created_at, deleted_at
FROM reconciliation_checkpoints
WHERE account_id = $1 AND budget_id = $2 AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC;

-- name: GetLatestCheckpoint :one
SELECT id, budget_id, account_id, statement_balance, statement_date, cleared_balance, ledger_balance, difference, transactions_count, reconciled_by_user_id, created_at, deleted_at
FROM reconciliation_checkpoints
WHERE account_id = $1 AND budget_id = $2 AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC
LIMIT 1;

-- name: AccountHasCheckpoints :one
SELECT EXISTS (
    SELECT 1
    FROM reconciliation_checkpoints
    WHERE account_id = $1 AND budget_id = $2 AND deleted_at IS NULL
);

-- name: SoftDeleteCheckpointsByAccount :exec
UPDATE reconciliation_checkpoints
SET deleted_at = now()
WHERE account_id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteCheckpointsByBudget :exec
UPDATE reconciliation_checkpoints
SET deleted_at = now()
WHERE budget_id = $1 AND deleted_at IS NULL;
