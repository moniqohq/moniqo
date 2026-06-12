-- name: GetUserByEmail :one
SELECT id, username, email, hash, name, picture, status, last_login, created_at
FROM users
WHERE lower(email) = lower($1)
  AND deleted_at IS NULL;

-- name: UpdateLastLogin :exec
UPDATE users
SET last_login = now(),
    updated_at = now()
WHERE id = $1
  AND deleted_at IS NULL;

-- name: InsertRevokedAccessToken :exec
INSERT INTO revoked_access_tokens (jti, user_id, expires_at)
VALUES ($1, $2, $3)
ON CONFLICT (jti) DO NOTHING;

-- name: IsAccessTokenRevoked :one
SELECT EXISTS (
    SELECT 1 FROM revoked_access_tokens WHERE jti = $1
) AS revoked;
