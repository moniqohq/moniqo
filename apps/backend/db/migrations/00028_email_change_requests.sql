-- +goose Up

-- Pending verified-email-change requests. A row is live while both consumed_at
-- and failed_at are NULL; consumed_at means verified, cancelled or superseded;
-- failed_at means three wrong codes and starts the cooldown.
CREATE TABLE email_change_requests (
    id            UUID         PRIMARY KEY,          -- generated in Go: the OTP hash is keyed on it
    user_id       BIGINT       NOT NULL REFERENCES users(id),
    new_email     VARCHAR(254) NOT NULL,
    code_hash     TEXT         NOT NULL,             -- hex HMAC-SHA256(secret, id || code)
    attempt_count INT          NOT NULL DEFAULT 0,
    expires_at    TIMESTAMPTZ  NOT NULL,
    consumed_at   TIMESTAMPTZ,
    failed_at     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT email_change_requests_attempts_ck
        CHECK (attempt_count >= 0 AND attempt_count <= 3),
    CONSTRAINT email_change_requests_terminal_ck
        CHECK (consumed_at IS NULL OR failed_at IS NULL)
);

-- At most one live request per user, enforced in the data model so two
-- concurrent POSTs can never leave two valid codes outstanding.
CREATE UNIQUE INDEX email_change_requests_one_live
    ON email_change_requests (user_id)
    WHERE consumed_at IS NULL AND failed_at IS NULL;

CREATE INDEX email_change_requests_user_failed
    ON email_change_requests (user_id, failed_at DESC)
    WHERE failed_at IS NOT NULL;

-- +goose Down
DROP TABLE IF EXISTS email_change_requests;
