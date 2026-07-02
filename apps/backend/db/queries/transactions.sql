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

-- name: SumEnvelopeSpent :one
SELECT COALESCE(SUM(amount), 0)::BIGINT AS spent
FROM transactions
WHERE envelope_id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: EnvelopeHasTransactions :one
SELECT EXISTS (
    SELECT 1
    FROM transactions
    WHERE envelope_id = $1 AND budget_id = $2 AND deleted_at IS NULL
) AS exists;

-- name: SumOnBudgetAccountBalances :one
SELECT COALESCE(SUM(t.amount), 0)::BIGINT AS total_balance
FROM transactions t
JOIN accounts a ON a.id = t.account_id
WHERE t.budget_id    = $1
  AND a.is_on_budget = true
  AND a.deleted_at   IS NULL
  AND t.deleted_at   IS NULL;
