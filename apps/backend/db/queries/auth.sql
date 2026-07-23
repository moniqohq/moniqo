-- name: GetUserByEmail :one
SELECT id, username, email, hash, name, picture, status, currency, timezone, onboarding_completed_at, last_login, created_at
FROM users
WHERE lower(email) = lower($1)
  AND deleted_at IS NULL;

-- name: GetUserByEmailForLinking :one
-- Lighter than GetUserByEmail: never touches hash, since OIDC linking is not
-- password-aware.
SELECT id, username, email, status
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

-- name: InsertRefreshToken :one
INSERT INTO refresh_tokens (family_id, user_id, token_hash, expires_at, absolute_expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;

-- name: GetRefreshTokenByHash :one
SELECT id, family_id, user_id, token_hash, issued_at, expires_at, absolute_expires_at, used_at, revoked_at, revoked_reason
FROM refresh_tokens
WHERE token_hash = $1;

-- name: MarkRefreshTokenUsed :exec
UPDATE refresh_tokens
SET used_at = now()
WHERE id = $1
  AND used_at IS NULL;

-- name: RevokeRefreshTokenFamily :exec
UPDATE refresh_tokens
SET revoked_at     = now(),
    revoked_reason = $2
WHERE family_id  = $1
  AND revoked_at IS NULL;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revoked_at     = now(),
    revoked_reason = $2
WHERE token_hash   = $1
  AND revoked_at IS NULL;

-- name: RevokeAllUserRefreshTokens :exec
UPDATE refresh_tokens
SET revoked_at     = now(),
    revoked_reason = $2
WHERE user_id      = $1
  AND revoked_at IS NULL;

-- name: DeleteExpiredRevokedAccessTokens :exec
DELETE FROM revoked_access_tokens
WHERE expires_at < now();
