-- name: CreateEnvelope :one
INSERT INTO envelopes (budget_id, title, allocated_amt, description, nature)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, budget_id, title, allocated_amt, description, created_at, updated_at, deleted_at, nature;

-- name: GetEnvelopeByID :one
SELECT id, budget_id, title, allocated_amt, description, created_at, updated_at, deleted_at, nature
FROM envelopes
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: IsEnvelopeArchived :one
-- No deleted_at filter: for envelopes, deleted_at IS the archive flag.
-- pgx.ErrNoRows means the envelope does not exist in this budget.
SELECT (deleted_at IS NOT NULL)::bool AS archived
FROM envelopes
WHERE id = $1 AND budget_id = $2;

-- name: ListEnvelopesByBudget :many
SELECT id, budget_id, title, allocated_amt, description, created_at, updated_at, deleted_at, nature
FROM envelopes
WHERE budget_id = $1
  AND (sqlc.narg(archived)::bool IS NULL OR (deleted_at IS NOT NULL) = sqlc.narg(archived))
ORDER BY lower(title) ASC;

-- name: UpdateEnvelope :one
-- nature is intentionally excluded: it is set once at creation and is immutable thereafter.
UPDATE envelopes
SET title         = $3,
    allocated_amt = $4,
    description   = $5,
    updated_at    = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, title, allocated_amt, description, created_at, updated_at, deleted_at, nature;

-- name: PatchEnvelope :one
-- nature is intentionally excluded: it is set once at creation and is immutable thereafter.
UPDATE envelopes
SET title         = COALESCE(sqlc.narg(title), title),
    allocated_amt = COALESCE(sqlc.narg(allocated_amt), allocated_amt),
    description   = COALESCE(sqlc.narg(description), description),
    updated_at    = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, title, allocated_amt, description, created_at, updated_at, deleted_at, nature;

-- name: SoftDeleteEnvelope :exec
UPDATE envelopes
SET deleted_at = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL;

-- name: HardDeleteEnvelope :exec
DELETE FROM envelopes
WHERE id = $1 AND budget_id = $2;

-- name: EnvelopeExistsByTitle :one
SELECT EXISTS (
    SELECT 1
    FROM envelopes
    WHERE budget_id    = $1
      AND lower(title) = lower($2)
      AND deleted_at   IS NULL
) AS exists;

-- name: EnvelopeExistsByTitleExcluding :one
SELECT EXISTS (
    SELECT 1
    FROM envelopes
    WHERE budget_id    = $1
      AND lower(title) = lower($2)
      AND id           != $3
      AND deleted_at   IS NULL
) AS exists;

-- name: GetEnvelopeForUpdate :one
SELECT id, budget_id, title, allocated_amt, description, created_at, updated_at, deleted_at
FROM envelopes
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
FOR UPDATE;

-- name: AdjustEnvelopeAllocated :one
UPDATE envelopes
SET allocated_amt = allocated_amt + $3,
    updated_at    = now()
WHERE id = $1 AND budget_id = $2 AND deleted_at IS NULL
RETURNING id, budget_id, title, allocated_amt, description, created_at, updated_at, deleted_at;

-- name: SumBudgetAllocated :one
SELECT COALESCE(SUM(allocated_amt), 0)::BIGINT AS total_allocated
FROM envelopes
WHERE budget_id = $1 AND deleted_at IS NULL;

-- name: GetBudgetEnvelopeSummary :one
-- t.spent is a positive magnitude; outflows are stored as negative amounts.
SELECT
    COALESCE(SUM(e.allocated_amt), 0)::BIGINT                                  AS total_allocated,
    COALESCE(SUM(COALESCE(t.spent, 0)), 0)::BIGINT                             AS total_spent,
    COUNT(*) FILTER (WHERE COALESCE(t.spent, 0) > e.allocated_amt)::BIGINT     AS overspent_count
FROM envelopes e
LEFT JOIN (
    SELECT envelope_id, -SUM(amount) AS spent
    FROM transactions tr
    WHERE tr.budget_id   = $1
      AND tr.envelope_id IS NOT NULL
      AND tr.deleted_at  IS NULL
    GROUP BY tr.envelope_id
) t ON t.envelope_id = e.id
WHERE e.budget_id = $1 AND e.deleted_at IS NULL;
