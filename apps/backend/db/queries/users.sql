-- name: CreateUser :one
INSERT INTO users (username, email, hash, name)
VALUES ($1, $2, $3, $4)
RETURNING id, username, email, name, picture, status, last_login, created_at, updated_at, deleted_at;

-- name: GetUserByID :one
SELECT id, username, email, name, picture, status, last_login, created_at, updated_at, deleted_at
FROM users
WHERE id = $1 AND deleted_at IS NULL;
