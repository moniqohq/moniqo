-- name: CreateAccount :one
INSERT INTO accounts (budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING id, budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number, last_reconciled_at, archived_at, created_at, updated_at, deleted_at;

-- name: GetAccountByID :one
SELECT id, budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number, last_reconciled_at, archived_at, created_at, updated_at, deleted_at
FROM accounts
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: ListAccountsByBudget :many
SELECT id, budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number, last_reconciled_at, archived_at, created_at, updated_at, deleted_at
FROM accounts
WHERE budget_id = $1
  AND deleted_at IS NULL
  AND (sqlc.narg(archived)::bool IS NULL OR (archived_at IS NOT NULL) = sqlc.narg(archived))
ORDER BY lower(name) ASC;

-- name: UpdateAccount :one
UPDATE accounts
SET name           = $3,
    type           = $4,
    requires_recon = $5,
    is_on_budget   = $6,
    is_immutable   = $7,
    notes          = $8,
    account_number = $9,
    updated_at     = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number, last_reconciled_at, archived_at, created_at, updated_at, deleted_at;

-- name: PatchAccount :one
UPDATE accounts
SET name           = COALESCE(sqlc.narg(name), name),
    type           = COALESCE(sqlc.narg(type), type),
    requires_recon = COALESCE(sqlc.narg(requires_recon), requires_recon),
    is_on_budget   = COALESCE(sqlc.narg(is_on_budget), is_on_budget),
    is_immutable   = COALESCE(sqlc.narg(is_immutable), is_immutable),
    notes          = COALESCE(sqlc.narg(notes), notes),
    account_number = COALESCE(sqlc.narg(account_number), account_number),
    updated_at     = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number, last_reconciled_at, archived_at, created_at, updated_at, deleted_at;

-- name: MarkAccountReconciled :one
UPDATE accounts
SET last_reconciled_at = now(), updated_at = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number, last_reconciled_at, archived_at, created_at, updated_at, deleted_at;

-- name: ArchiveAccount :one
UPDATE accounts
SET archived_at = now(), updated_at = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL AND archived_at IS NULL
RETURNING id, budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number, last_reconciled_at, archived_at, created_at, updated_at, deleted_at;

-- name: UnarchiveAccount :one
UPDATE accounts
SET archived_at = NULL, updated_at = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, name, type, requires_recon, is_on_budget, is_immutable, notes, account_number, last_reconciled_at, archived_at, created_at, updated_at, deleted_at;

-- name: IsAccountArchived :one
SELECT (archived_at IS NOT NULL)::bool AS archived
FROM accounts
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: SoftDeleteAccount :exec
UPDATE accounts
SET deleted_at = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: HardDeleteAccount :exec
DELETE FROM accounts
WHERE id = $1 AND budget_id = $2;

-- name: AccountExistsByName :one
SELECT EXISTS (
    SELECT 1
    FROM accounts
    WHERE budget_id  = $1
      AND lower(name) = lower($2)
      AND deleted_at IS NULL
) AS exists;

-- name: AccountExistsByNameExcluding :one
SELECT EXISTS (
    SELECT 1
    FROM accounts
    WHERE budget_id   = $1
      AND lower(name)  = lower($2)
      AND id           != $3
      AND deleted_at   IS NULL
) AS exists;
