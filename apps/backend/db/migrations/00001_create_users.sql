-- +goose Up
CREATE TYPE user_status AS ENUM ('pending_verification', 'active');

CREATE TABLE users (
    id         BIGSERIAL    PRIMARY KEY,
    username   VARCHAR(12)  NOT NULL,
    email      VARCHAR(254) NOT NULL,
    hash       TEXT         NOT NULL,
    name       VARCHAR(100),
    picture    TEXT         NOT NULL DEFAULT '',
    status     user_status  NOT NULL DEFAULT 'pending_verification',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- Uniqueness includes soft-deleted rows: a deleted username/email cannot be re-registered.
CREATE UNIQUE INDEX users_username_key ON users (lower(username));
CREATE UNIQUE INDEX users_email_key    ON users (lower(email));

-- +goose Down
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_status;
