-- name: CreateTransaction :one
INSERT INTO transactions (budget_id, account_id, amount, memo)
VALUES ($1, $2, $3, $4)
RETURNING id, budget_id, account_id, amount, memo, created_at, deleted_at;

-- name: SumAccountBalance :one
SELECT COALESCE(SUM(amount), 0)::BIGINT AS balance
FROM transactions
WHERE account_id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: AccountHasTransactions :one
SELECT EXISTS (
    SELECT 1
    FROM transactions
    WHERE account_id = $1 AND budget_id = $2 AND deleted_at IS NULL
) AS exists;
