-- name: CountUsersByEmail :one
-- Mirrors the case-insensitive uniqueness check enforced by users_email_key
-- (which also covers soft-deleted rows), so a would-be email change can be
-- rejected before a 15-minute OTP is issued for an address that can never
-- be claimed.
SELECT count(*)
FROM users
WHERE lower(email) = lower($1);

-- name: GetLiveEmailChangeRequest :one
SELECT id, user_id, new_email, code_hash, attempt_count, expires_at, consumed_at, failed_at, created_at
FROM email_change_requests
WHERE user_id = $1 AND consumed_at IS NULL AND failed_at IS NULL;

-- name: GetLatestEmailChangeLockout :one
SELECT failed_at
FROM email_change_requests
WHERE user_id = $1 AND failed_at IS NOT NULL
ORDER BY failed_at DESC
LIMIT 1;

-- name: SupersedeEmailChangeRequests :exec
-- Invalidates any still-live request for the user so a fresh POST always
-- starts from a clean slate (a new request supersedes a pending one).
UPDATE email_change_requests
SET consumed_at = now()
WHERE user_id = $1 AND consumed_at IS NULL AND failed_at IS NULL;

-- name: InsertEmailChangeRequest :one
-- id is generated in Go (uuid.New()), not gen_random_uuid(), because the OTP
-- hash is HMAC-keyed on the request id and must be known before the insert.
INSERT INTO email_change_requests (id, user_id, new_email, code_hash, expires_at)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, user_id, new_email, code_hash, attempt_count, expires_at, consumed_at, failed_at, created_at;

-- name: IncrementEmailChangeAttempt :one
UPDATE email_change_requests
SET attempt_count = attempt_count + 1
WHERE id = $1
RETURNING attempt_count;

-- name: MarkEmailChangeFailed :exec
UPDATE email_change_requests
SET failed_at = now()
WHERE id = $1 AND failed_at IS NULL AND consumed_at IS NULL;

-- name: MarkEmailChangeConsumed :exec
UPDATE email_change_requests
SET consumed_at = now()
WHERE id = $1 AND consumed_at IS NULL;

-- name: DeleteStaleEmailChangeRequests :exec
-- Sweeps rows a day after creation regardless of outcome. Deliberately keyed
-- off created_at, not expires_at: expires_at marks when the OTP dies, but a
-- failed_at lockout row must survive past that so the cooldown can still be
-- looked up.
DELETE FROM email_change_requests
WHERE created_at < now() - interval '24 hours';
