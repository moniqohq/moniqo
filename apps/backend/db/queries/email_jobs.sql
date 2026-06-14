-- name: EnqueueEmailJob :exec
INSERT INTO email_jobs (
    idempotency_key, template_name, recipient_email,
    recipient_name, payload, max_attempts
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (idempotency_key) DO NOTHING;

-- name: LockEmailJobs :many
-- Claims up to $1 pending/failed jobs by setting locked_by=$2.
-- Also re-claims abandoned jobs whose locked_by was set but never cleared (worker
-- crashed) by treating any job with locked_by IS NOT NULL and updated_at older
-- than 10 minutes as eligible for retry.
UPDATE email_jobs
SET locked_by  = $2,
    updated_at = NOW()
WHERE id IN (
    SELECT id FROM email_jobs
    WHERE (
        (status IN ('pending', 'failed') AND locked_by IS NULL     AND next_attempt_at <= NOW())
        OR
        (status IN ('pending', 'failed') AND locked_by IS NOT NULL AND updated_at < NOW() - INTERVAL '10 minutes')
    )
    ORDER BY next_attempt_at, id
    LIMIT $1
    FOR UPDATE SKIP LOCKED
)
RETURNING id, template_name, recipient_email, recipient_name,
          payload, max_attempts, attempt_count;

-- name: MarkEmailJobSent :exec
UPDATE email_jobs
SET status     = 'sent',
    sent_at    = NOW(),
    locked_by  = NULL,
    updated_at = NOW()
WHERE id = $1;

-- name: MarkEmailJobFailed :exec
UPDATE email_jobs
SET status          = CASE
                          WHEN attempt_count + 1 >= max_attempts THEN 'dead'::email_job_status
                          ELSE 'failed'::email_job_status
                      END,
    attempt_count   = attempt_count + 1,
    last_error      = $2,
    next_attempt_at = $3,
    locked_by       = NULL,
    updated_at      = NOW()
WHERE id = $1;
