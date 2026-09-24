-- +goose Up
ALTER TABLE users
    ADD COLUMN avatar_key          TEXT   NOT NULL DEFAULT '',
    ADD COLUMN avatar_content_type TEXT   NOT NULL DEFAULT '',
    ADD COLUMN avatar_size_bytes   BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN avatar_etag         TEXT   NOT NULL DEFAULT '',
    ADD COLUMN avatar_updated_at   TIMESTAMPTZ;

-- +goose Down
ALTER TABLE users
    DROP COLUMN IF EXISTS avatar_key,
    DROP COLUMN IF EXISTS avatar_content_type,
    DROP COLUMN IF EXISTS avatar_size_bytes,
    DROP COLUMN IF EXISTS avatar_etag,
    DROP COLUMN IF EXISTS avatar_updated_at;
