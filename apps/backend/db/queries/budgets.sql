-- name: CreateBudget :one
INSERT INTO budgets (title, notes)
VALUES ($1, $2)
RETURNING id, title, notes, created_at, updated_at, deleted_at;

-- name: GetBudgetByID :one
SELECT id, title, notes, created_at, updated_at, deleted_at
FROM budgets
WHERE id = $1 AND deleted_at IS NULL;

-- name: ListBudgetsForUser :many
SELECT b.id, b.title, b.notes, b.created_at, b.updated_at, b.deleted_at
FROM budgets b
JOIN budget_users bu ON bu.budget_id = b.id
WHERE bu.user_id    = $1
  AND bu.deleted_at IS NULL
  AND b.deleted_at  IS NULL
ORDER BY b.created_at DESC;

-- name: UpdateBudget :one
UPDATE budgets
SET title = $2, notes = $3, updated_at = now()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, title, notes, created_at, updated_at, deleted_at;

-- name: PatchBudget :one
UPDATE budgets
SET title      = COALESCE(sqlc.narg(title), title),
    notes      = COALESCE(sqlc.narg(notes), notes),
    updated_at = now()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, title, notes, created_at, updated_at, deleted_at;

-- name: SoftDeleteBudget :exec
UPDATE budgets
SET deleted_at = now()
WHERE id = $1 AND deleted_at IS NULL;

-- name: BudgetTitleExistsForUser :one
SELECT EXISTS (
    SELECT 1
    FROM budgets b
    JOIN budget_users bu ON bu.budget_id = b.id
    WHERE bu.user_id     = $1
      AND bu.role        = 'OWNER'
      AND bu.deleted_at  IS NULL
      AND b.deleted_at   IS NULL
      AND lower(b.title) = lower($2)
      AND b.id          != $3
) AS exists;
