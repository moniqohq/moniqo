-- +goose Up

-- Per-user access-token epoch: any access token issued before this timestamp is rejected.
-- NULL means no epoch has been set (all tokens are valid by issue time alone).
ALTER TABLE users ADD COLUMN tokens_invalid_before TIMESTAMPTZ;

CREATE TABLE password_reset_tokens (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    BIGINT      NOT NULL REFERENCES users(id),
    token_hash TEXT        NOT NULL UNIQUE,  -- SHA-256 hex of the raw token
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,                  -- set on successful confirmation
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON password_reset_tokens (token_hash);
CREATE INDEX ON password_reset_tokens (user_id);

-- +goose Down
DROP TABLE IF EXISTS password_reset_tokens;
ALTER TABLE users DROP COLUMN IF EXISTS tokens_invalid_before;
