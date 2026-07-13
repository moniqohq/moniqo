-- name: SearchTransactions :many
-- Case-insensitive substring match over transaction memos within a budget.
-- Joins account (always present) and envelope (optional) for display-ready hits.
SELECT t.id, t.budget_id, t.account_id, t.envelope_id, t.amount, t.date, t.memo, t.status,
       a.name  AS account_name,
       e.title AS envelope_title
FROM transactions t
JOIN accounts a       ON a.id = t.account_id
LEFT JOIN envelopes e ON e.id = t.envelope_id
WHERE t.budget_id  = sqlc.arg(budget_id)
  AND t.deleted_at IS NULL
  AND t.memo ILIKE ('%' || sqlc.arg(query)::text || '%')
ORDER BY t.date DESC, t.id DESC
LIMIT sqlc.arg(lim);

-- name: SearchAccounts :many
SELECT id, budget_id, name, type, institution
FROM accounts
WHERE budget_id  = sqlc.arg(budget_id)
  AND deleted_at IS NULL
  AND (name        ILIKE ('%' || sqlc.arg(query)::text || '%')
    OR institution ILIKE ('%' || sqlc.arg(query)::text || '%')
    OR notes       ILIKE ('%' || sqlc.arg(query)::text || '%'))
ORDER BY lower(name) ASC
LIMIT sqlc.arg(lim);

-- name: SearchEnvelopes :many
SELECT id, budget_id, title, description
FROM envelopes
WHERE budget_id  = sqlc.arg(budget_id)
  AND deleted_at IS NULL
  AND (title       ILIKE ('%' || sqlc.arg(query)::text || '%')
    OR description ILIKE ('%' || sqlc.arg(query)::text || '%'))
ORDER BY lower(title) ASC
LIMIT sqlc.arg(lim);

-- name: SearchBudgets :many
-- Cross-membership: searches every budget the user actively belongs to so the
-- global palette can jump/switch budgets. Scoped by user_id, not budget_id.
SELECT b.id, b.title, b.notes, bu.role
FROM budgets b
JOIN budget_users bu ON bu.budget_id = b.id
WHERE bu.user_id    = sqlc.arg(user_id)
  AND bu.deleted_at IS NULL
  AND b.deleted_at  IS NULL
  AND (b.title ILIKE ('%' || sqlc.arg(query)::text || '%')
    OR b.notes ILIKE ('%' || sqlc.arg(query)::text || '%'))
ORDER BY lower(b.title) ASC
LIMIT sqlc.arg(lim);
