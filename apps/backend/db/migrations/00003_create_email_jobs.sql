-- +goose Up

CREATE TYPE email_job_status AS ENUM (
    'pending',
    'failed',
    'dead',
    'sent'
);

CREATE TABLE email_jobs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key  TEXT        UNIQUE NOT NULL,
    status           email_job_status NOT NULL DEFAULT 'pending',
    template_name    TEXT        NOT NULL,
    recipient_email  TEXT        NOT NULL,
    recipient_name   TEXT        NOT NULL DEFAULT '',
    payload          JSONB       NOT NULL DEFAULT '{}',
    max_attempts     INT         NOT NULL DEFAULT 3,
    attempt_count    INT         NOT NULL DEFAULT 0,
    last_error       TEXT,
    next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    locked_by        TEXT,
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Covers the hot polling path: pending/failed jobs ready to run, ordered by due time.
CREATE INDEX idx_email_jobs_queue
    ON email_jobs (next_attempt_at, id)
    WHERE status IN ('pending', 'failed');

-- +goose Down
DROP TABLE IF EXISTS email_jobs;
DROP TYPE IF EXISTS email_job_status;
