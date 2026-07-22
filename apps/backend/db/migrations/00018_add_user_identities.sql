-- +goose Up
CREATE TABLE user_identities (
    id               BIGSERIAL    PRIMARY KEY,
    user_id          BIGINT       NOT NULL REFERENCES users(id),
    provider         VARCHAR(32)  NOT NULL,
    provider_subject VARCHAR(255) NOT NULL,
    provider_email   VARCHAR(254),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_identities_provider_subject_key ON user_identities (provider, provider_subject);
CREATE INDEX ON user_identities (user_id);

-- +goose Down
DROP TABLE IF EXISTS user_identities;
