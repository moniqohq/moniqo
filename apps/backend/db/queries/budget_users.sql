-- name: CreateMembership :one
INSERT INTO budget_users (budget_id, user_id, role)
VALUES ($1, $2, $3)
RETURNING id, budget_id, user_id, role, joined_at, deleted_at;

-- name: GetMembership :one
SELECT id, budget_id, user_id, role, joined_at, deleted_at
FROM budget_users
WHERE budget_id  = $1
  AND user_id    = $2
  AND deleted_at IS NULL;

-- name: ListMembersForBudget :many
SELECT id, budget_id, user_id, role, joined_at, deleted_at
FROM budget_users
WHERE budget_id  = $1
  AND deleted_at IS NULL
ORDER BY joined_at ASC;

-- name: UpdateMemberRole :one
UPDATE budget_users
SET role = $3
WHERE budget_id  = $1
  AND user_id    = $2
  AND deleted_at IS NULL
RETURNING id, budget_id, user_id, role, joined_at, deleted_at;

-- name: SoftDeleteMembership :exec
UPDATE budget_users
SET deleted_at = now()
WHERE budget_id  = $1
  AND user_id    = $2
  AND deleted_at IS NULL;

-- name: SoftDeleteAllMembershipsForBudget :exec
UPDATE budget_users
SET deleted_at = now()
WHERE budget_id  = $1
  AND deleted_at IS NULL;

-- name: CountOwnersForBudget :one
SELECT COUNT(*)
FROM budget_users
WHERE budget_id  = $1
  AND role       = 'OWNER'
  AND deleted_at IS NULL;
