-- +goose Up
-- Envelopes apply to expenses only, not income: allocation (moving money into an
-- envelope) is conceptually distinct from spending it, and a positive-amount
-- transaction tagged to an envelope would reduce its spent total instead of
-- reflecting an allocation. Backfill any rows created before this rule was
-- enforced at the API layer.
UPDATE transactions
SET envelope_id = NULL
WHERE amount > 0 AND transfer_account_id IS NULL AND envelope_id IS NOT NULL;

-- +goose Down
-- The original envelope_id values are not recoverable; this is a one-way data
-- correction, not a schema change, so there is nothing to reverse.
SELECT 1;
