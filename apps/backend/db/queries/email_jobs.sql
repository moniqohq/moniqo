-- name: EnqueueEmailJob :exec
INSERT INTO email_jobs (
    idempotency_key, template_name, recipient_email,
    recipient_name, payload, max_attempts
) VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (idempotency_key) DO NOTHING;

-- name: ClaimEmailJobs :many
SELECT id, idempotency_key, status, template_name, recipient_email, recipient_name,
       payload, max_attempts, attempt_count, last_error, next_attempt_at, locked_by,
       sent_at, created_at, updated_at
FROM email_jobs
WHERE status IN ('pending', 'failed')
  AND next_attempt_at <= NOW()
ORDER BY next_attempt_at, id
LIMIT $1
FOR UPDATE SKIP LOCKED;

-- name: MarkEmailJobSent :exec
UPDATE email_jobs
SET status     = 'sent',
    sent_at    = NOW(),
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
    updated_at      = NOW()
WHERE id = $1;
