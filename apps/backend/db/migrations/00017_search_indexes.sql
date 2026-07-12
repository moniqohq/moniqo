-- +goose Up
-- Global search: enable trigram matching so case-insensitive ILIKE '%term%'
-- substring queries over free-text columns are index-backed rather than
-- sequential scans. Indexes are partial (active rows only) to match the
-- deleted_at IS NULL filter used by every search query.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX transactions_memo_trgm_idx
    ON transactions USING gin (memo gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX accounts_name_trgm_idx
    ON accounts USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX accounts_institution_trgm_idx
    ON accounts USING gin (institution gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX envelopes_title_trgm_idx
    ON envelopes USING gin (title gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX envelopes_description_trgm_idx
    ON envelopes USING gin (description gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX budgets_title_trgm_idx
    ON budgets USING gin (title gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX budgets_notes_trgm_idx
    ON budgets USING gin (notes gin_trgm_ops) WHERE deleted_at IS NULL;

-- +goose Down
DROP INDEX IF EXISTS budgets_notes_trgm_idx;
DROP INDEX IF EXISTS budgets_title_trgm_idx;
DROP INDEX IF EXISTS envelopes_description_trgm_idx;
DROP INDEX IF EXISTS envelopes_title_trgm_idx;
DROP INDEX IF EXISTS accounts_institution_trgm_idx;
DROP INDEX IF EXISTS accounts_name_trgm_idx;
DROP INDEX IF EXISTS transactions_memo_trgm_idx;
-- Extension is left installed; other features may come to rely on it.
