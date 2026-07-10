-- name: CreateTransaction :one
INSERT INTO transactions (budget_id, account_id, amount, memo)
VALUES ($1, $2, $3, $4)
RETURNING id, budget_id, account_id, amount, memo, created_at, deleted_at;

-- name: GetAccountBalances :one
SELECT
    COALESCE(SUM(amount), 0)::BIGINT AS balance,
    COALESCE(SUM(amount) FILTER (WHERE status <> 'uncleared'), 0)::BIGINT AS cleared_balance
FROM transactions
WHERE account_id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: MarkAccountTransactionsReconciled :exec
UPDATE transactions
SET status = 'reconciled', updated_at = now()
WHERE account_id = $1 AND budget_id = $2 AND status = 'cleared' AND deleted_at IS NULL;

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

-- name: HardDeleteTransactionsByEnvelope :exec
DELETE FROM transactions
WHERE envelope_id = $1 AND budget_id = $2;

-- name: SumOnBudgetAccountBalances :one
SELECT COALESCE(SUM(t.amount), 0)::BIGINT AS total_balance
FROM transactions t
JOIN accounts a ON a.id = t.account_id
WHERE t.budget_id    = $1
  AND a.is_on_budget = true
  AND a.deleted_at   IS NULL
  AND t.deleted_at   IS NULL;

-- name: CreateFullTransaction :one
INSERT INTO transactions (budget_id, account_id, envelope_id, transfer_account_id, transfer_group_id, amount, date, memo, status)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING id, budget_id, account_id, envelope_id, transfer_account_id, transfer_group_id, amount, date, memo, status, created_at, updated_at, deleted_at;

-- name: GetTransactionByID :one
SELECT id, budget_id, account_id, envelope_id, transfer_account_id, transfer_group_id, amount, date, memo, status, created_at, updated_at, deleted_at
FROM transactions
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: ListTransactions :many
SELECT id, budget_id, account_id, envelope_id, transfer_account_id, transfer_group_id, amount, date, memo, status, created_at, updated_at, deleted_at
FROM transactions
WHERE budget_id = $1
  AND deleted_at IS NULL
  AND (account_id    = sqlc.narg(account_id)  OR sqlc.narg(account_id)  IS NULL)
  AND (envelope_id   = sqlc.narg(envelope_id) OR sqlc.narg(envelope_id) IS NULL)
  AND (date >= sqlc.narg(date_from) OR sqlc.narg(date_from) IS NULL)
  AND (date <= sqlc.narg(date_to)   OR sqlc.narg(date_to)   IS NULL)
ORDER BY date DESC, id DESC
LIMIT $2 OFFSET $3;

-- name: CountTransactions :one
SELECT COUNT(*)::BIGINT AS total
FROM transactions
WHERE budget_id = $1
  AND deleted_at IS NULL
  AND (account_id    = sqlc.narg(account_id)  OR sqlc.narg(account_id)  IS NULL)
  AND (envelope_id   = sqlc.narg(envelope_id) OR sqlc.narg(envelope_id) IS NULL)
  AND (date >= sqlc.narg(date_from) OR sqlc.narg(date_from) IS NULL)
  AND (date <= sqlc.narg(date_to)   OR sqlc.narg(date_to)   IS NULL);

-- name: UpdateTransaction :one
UPDATE transactions
SET account_id         = $3,
    envelope_id        = $4,
    transfer_account_id = $5,
    amount             = $6,
    date               = $7,
    memo               = $8,
    updated_at         = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, account_id, envelope_id, transfer_account_id, transfer_group_id, amount, date, memo, status, created_at, updated_at, deleted_at;

-- name: PatchTransaction :one
UPDATE transactions
SET account_id          = COALESCE(sqlc.narg(account_id), account_id),
    envelope_id         = COALESCE(sqlc.narg(envelope_id), envelope_id),
    transfer_account_id = COALESCE(sqlc.narg(transfer_account_id), transfer_account_id),
    amount              = COALESCE(sqlc.narg(amount), amount),
    date                = COALESCE(sqlc.narg(date), date),
    memo                = COALESCE(sqlc.narg(memo), memo),
    status              = COALESCE(sqlc.narg(status), status),
    updated_at          = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, account_id, envelope_id, transfer_account_id, transfer_group_id, amount, date, memo, status, created_at, updated_at, deleted_at;

-- name: SoftDeleteTransaction :exec
UPDATE transactions
SET deleted_at = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: GetTransactionsByGroupID :many
SELECT id, budget_id, account_id, envelope_id, transfer_account_id, transfer_group_id, amount, date, memo, status, created_at, updated_at, deleted_at
FROM transactions
WHERE transfer_group_id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteTransactionsByGroupID :exec
UPDATE transactions
SET deleted_at = now()
WHERE transfer_group_id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: GetNetWorth :one
SELECT COALESCE(SUM(t.amount), 0)::BIGINT AS net_worth
FROM transactions t
JOIN accounts a ON a.id = t.account_id
WHERE t.budget_id  = $1
  AND t.deleted_at IS NULL
  AND a.deleted_at IS NULL;

-- name: GetMonthlyStats :one
SELECT
    COALESCE(SUM(CASE WHEN amount > 0 AND transfer_account_id IS NULL THEN amount ELSE 0 END), 0)::BIGINT AS income,
    COALESCE(ABS(SUM(CASE WHEN amount < 0 AND transfer_account_id IS NULL THEN amount ELSE 0 END)), 0)::BIGINT AS expenses
FROM transactions
WHERE budget_id  = $1
  AND deleted_at IS NULL
  AND date >= date_trunc('month', $2::timestamptz)
  AND date <  date_trunc('month', $2::timestamptz) + interval '1 month';

-- name: GetMonthlySparkline :many
SELECT
    date_trunc('month', date)::date AS month,
    COALESCE(SUM(CASE WHEN amount > 0 AND transfer_account_id IS NULL THEN amount ELSE 0 END), 0)::BIGINT AS income,
    COALESCE(ABS(SUM(CASE WHEN amount < 0 AND transfer_account_id IS NULL THEN amount ELSE 0 END)), 0)::BIGINT AS expenses
FROM transactions
WHERE budget_id  = $1
  AND deleted_at IS NULL
  AND date >= date_trunc('month', now()) - interval '5 months'
  AND date <  date_trunc('month', now()) + interval '1 month'
GROUP BY date_trunc('month', date)
ORDER BY month ASC;

-- name: GetAccountTypeBalanceHistory :many
WITH months AS (
    SELECT generate_series(
        date_trunc('month', now()) - (interval '1 month' * (sqlc.arg(months)::int - 1)),
        date_trunc('month', now()),
        interval '1 month'
    )::date AS month
)
SELECT
    m.month,
    a.type,
    COALESCE(SUM(t.amount) FILTER (WHERE t.date < m.month + interval '1 month'), 0)::BIGINT AS balance
FROM months m
CROSS JOIN accounts a
LEFT JOIN transactions t ON t.account_id = a.id AND t.deleted_at IS NULL
WHERE a.budget_id = $1
  AND a.deleted_at IS NULL
  AND a.archived_at IS NULL
GROUP BY m.month, a.type
ORDER BY m.month ASC;
