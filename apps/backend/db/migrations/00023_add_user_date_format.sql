-- +goose Up
ALTER TABLE users ADD COLUMN date_format VARCHAR(20);
ALTER TABLE users ADD CONSTRAINT users_date_format_check
    CHECK (date_format IS NULL OR date_format IN ('MMM DD, YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'));

-- +goose Down
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_date_format_check;
ALTER TABLE users DROP COLUMN IF EXISTS date_format;
