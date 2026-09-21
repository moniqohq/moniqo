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

-- name: SoftDeleteAllMembershipsForUser :exec
-- Used on account deletion for budgets that survive (i.e. the user was not
-- their sole owner) so the deleted user leaves no active membership behind.
UPDATE budget_users
SET deleted_at = now()
WHERE user_id    = $1
  AND deleted_at IS NULL;

-- name: ListBlockingSoleOwnedBudgets :many
-- Budgets where the user is the only active OWNER and other active members
-- exist. These block account deletion until ownership is transferred or the
-- other members are removed -- deleting the account must never silently
-- destroy a shared budget's data.
SELECT b.id, b.title
FROM budgets b
JOIN budget_users bu
  ON bu.budget_id  = b.id
 AND bu.user_id    = $1
 AND bu.deleted_at IS NULL
 AND bu.role       = 'OWNER'
WHERE b.deleted_at IS NULL
  AND (
    SELECT COUNT(*) FROM budget_users o
    WHERE o.budget_id = b.id AND o.deleted_at IS NULL AND o.role = 'OWNER'
  ) = 1
  AND EXISTS (
    SELECT 1 FROM budget_users m
    WHERE m.budget_id = b.id AND m.deleted_at IS NULL AND m.user_id != $1
  )
ORDER BY b.id;

-- name: ListSoloOwnedBudgets :many
-- Budgets where the user is OWNER and the only active member -- safe to
-- cascade-delete as part of account deletion since no one else is affected.
SELECT b.id
FROM budgets b
JOIN budget_users bu
  ON bu.budget_id  = b.id
 AND bu.user_id    = $1
 AND bu.deleted_at IS NULL
 AND bu.role       = 'OWNER'
WHERE b.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM budget_users m
    WHERE m.budget_id = b.id AND m.deleted_at IS NULL AND m.user_id != $1
  )
ORDER BY b.id;
