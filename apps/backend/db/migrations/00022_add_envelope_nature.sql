-- +goose Up
ALTER TABLE envelopes ADD COLUMN nature VARCHAR(8)
    CHECK (nature IN ('want', 'should', 'need', 'must'));

-- +goose Down
ALTER TABLE envelopes DROP COLUMN IF EXISTS nature;
