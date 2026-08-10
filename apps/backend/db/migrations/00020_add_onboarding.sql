-- +goose Up
ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN currency VARCHAR(3);
ALTER TABLE users ADD COLUMN timezone VARCHAR(64);

CREATE TABLE onboarding_progress (
    user_id         BIGINT      PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_step    SMALLINT    NOT NULL DEFAULT 1,
    completed_steps SMALLINT[]  NOT NULL DEFAULT '{}',
    budget_id       BIGINT      REFERENCES budgets(id),
    draft_payload   JSONB       NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'in_progress',
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS onboarding_progress;

ALTER TABLE users DROP COLUMN IF EXISTS timezone;
ALTER TABLE users DROP COLUMN IF EXISTS currency;
ALTER TABLE users DROP COLUMN IF EXISTS onboarding_completed_at;
