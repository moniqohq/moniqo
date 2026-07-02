-- +goose Up
CREATE TABLE envelopes (
    id            BIGSERIAL    PRIMARY KEY,
    budget_id     BIGINT       NOT NULL REFERENCES budgets(id),
    title         VARCHAR(80)  NOT NULL,
    allocated_amt BIGINT       NOT NULL DEFAULT 0,
    description   VARCHAR(500),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at    TIMESTAMPTZ
);

CREATE UNIQUE INDEX envelopes_budget_title_active_key ON envelopes (budget_id, lower(title)) WHERE deleted_at IS NULL;
CREATE INDEX envelopes_budget_id_idx ON envelopes (budget_id);

-- +goose Down
DROP TABLE IF EXISTS envelopes;
