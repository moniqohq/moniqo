-- +goose Up
CREATE TABLE refresh_tokens (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id           UUID        NOT NULL,
    user_id             BIGINT      NOT NULL REFERENCES users(id),
    token_hash          TEXT        NOT NULL,
    issued_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at          TIMESTAMPTZ NOT NULL,
    absolute_expires_at TIMESTAMPTZ NOT NULL,
    used_at             TIMESTAMPTZ,
    revoked_at          TIMESTAMPTZ,
    revoked_reason      TEXT
);

CREATE INDEX ON refresh_tokens (token_hash);
CREATE INDEX ON refresh_tokens (user_id);
CREATE INDEX ON refresh_tokens (family_id);

CREATE TABLE revoked_access_tokens (
    jti        UUID        PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX ON revoked_access_tokens (expires_at);

-- +goose Down
DROP TABLE IF EXISTS revoked_access_tokens;
DROP TABLE IF EXISTS refresh_tokens;
