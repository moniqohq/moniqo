-- name: GetOnboardingProgress :one
SELECT user_id, current_step, completed_steps, budget_id, draft_payload, status, started_at, completed_at, updated_at
FROM onboarding_progress
WHERE user_id = $1;

-- name: CreateOnboardingProgress :one
INSERT INTO onboarding_progress (user_id)
VALUES ($1)
RETURNING user_id, current_step, completed_steps, budget_id, draft_payload, status, started_at, completed_at, updated_at;

-- name: CompleteOnboardingStep :one
-- Advances current_step to step+1 and appends step to completed_steps (idempotent
-- via the NOT (step = ANY(...)) guard so re-completing a step doesn't duplicate it).
UPDATE onboarding_progress
SET completed_steps = CASE
        WHEN sqlc.arg(step)::SMALLINT = ANY(completed_steps) THEN completed_steps
        ELSE array_append(completed_steps, sqlc.arg(step)::SMALLINT)
    END,
    current_step = GREATEST(current_step, sqlc.arg(step)::SMALLINT + 1),
    budget_id    = COALESCE(sqlc.narg(budget_id), budget_id),
    updated_at   = now()
WHERE user_id = $1
RETURNING user_id, current_step, completed_steps, budget_id, draft_payload, status, started_at, completed_at, updated_at;

-- name: UpdateOnboardingDraftPayload :one
UPDATE onboarding_progress
SET draft_payload = $2, updated_at = now()
WHERE user_id = $1
RETURNING user_id, current_step, completed_steps, budget_id, draft_payload, status, started_at, completed_at, updated_at;

-- name: CompleteOnboarding :exec
UPDATE onboarding_progress
SET status = 'completed', completed_at = now(), updated_at = now()
WHERE user_id = $1;
