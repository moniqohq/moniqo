-- name: CreateUserIdentity :one
INSERT INTO user_identities (user_id, provider, provider_subject, provider_email)
VALUES ($1, $2, $3, $4)
RETURNING id, user_id, provider, provider_subject, provider_email, created_at, updated_at;

-- name: GetUserIdentityByProviderSubject :one
SELECT id, user_id, provider, provider_subject, provider_email, created_at, updated_at
FROM user_identities
WHERE provider = $1 AND provider_subject = $2;

-- name: ListUserIdentitiesByUserID :many
SELECT id, user_id, provider, provider_subject, provider_email, created_at, updated_at
FROM user_identities
WHERE user_id = $1
ORDER BY created_at;

-- name: DeleteUserIdentity :exec
DELETE FROM user_identities
WHERE user_id = $1 AND provider = $2;

-- name: CountUserIdentitiesByUserID :one
SELECT COUNT(*) FROM user_identities WHERE user_id = $1;
