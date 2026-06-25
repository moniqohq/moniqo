-- +goose Up
CREATE TYPE budget_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'VIEWER');

CREATE TABLE budgets (
    id         BIGSERIAL    PRIMARY KEY,
    title      VARCHAR(100) NOT NULL,
    notes      VARCHAR(500),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE budget_users (
    id         BIGSERIAL   PRIMARY KEY,
    budget_id  BIGINT      NOT NULL REFERENCES budgets(id),
    user_id    BIGINT      NOT NULL REFERENCES users(id),
    role       budget_role NOT NULL,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- One active membership per (budget, user).
CREATE UNIQUE INDEX budget_users_active_key ON budget_users (budget_id, user_id) WHERE deleted_at IS NULL;

CREATE INDEX budget_users_user_id_idx   ON budget_users (user_id);
CREATE INDEX budget_users_budget_id_idx ON budget_users (budget_id);

-- +goose Down
DROP TABLE IF EXISTS budget_users;
DROP TABLE IF EXISTS budgets;
DROP TYPE IF EXISTS budget_role;
