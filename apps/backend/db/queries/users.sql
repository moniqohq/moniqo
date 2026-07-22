-- name: CreateUser :one
INSERT INTO users (username, email, hash, name)
VALUES ($1, $2, $3, $4)
RETURNING id, username, email, name, picture, status, last_login, created_at, updated_at, deleted_at;

-- name: GetUserByID :one
SELECT id, username, email, name, picture, status, last_login, created_at, updated_at, deleted_at, tokens_invalid_before
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetUserHashByID :one
SELECT hash
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: UpdateUserProfile :one
UPDATE users
SET name = $2, username = $3, email = $4, picture = $5, updated_at = now()
WHERE id = $1 AND deleted_at IS NULL
RETURNING id, username, email, name, picture, status, last_login, created_at, updated_at, deleted_at;

-- name: UpdateUserPassword :exec
UPDATE users
SET hash = $2, updated_at = now()
WHERE id = $1 AND deleted_at IS NULL;

-- name: SoftDeleteUser :exec
UPDATE users
SET deleted_at = now()
WHERE id = $1 AND deleted_at IS NULL;

-- name: SetTokensInvalidBefore :exec
UPDATE users
SET tokens_invalid_before = $2, updated_at = now()
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetUserForPasswordReset :one
SELECT id, name, email, status
FROM users
WHERE lower(email) = lower($1)
  AND deleted_at IS NULL;

-- name: ActivateUser :exec
UPDATE users
SET status = 'active', updated_at = now()
WHERE id = $1 AND deleted_at IS NULL;

-- name: CreateUserWithoutPassword :one
-- Used for OIDC-only signups: no password credential, email already verified
-- by the identity provider so the account is created active, not pending.
INSERT INTO users (username, email, hash, name, picture, status)
VALUES ($1, $2, NULL, $3, $4, 'active')
RETURNING id, username, email, name, picture, status, last_login, created_at, updated_at, deleted_at;
