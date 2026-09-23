-- +goose Up
ALTER TABLE envelopes
    ADD CONSTRAINT envelopes_allocated_amt_nonneg CHECK (allocated_amt >= 0);

-- +goose Down
ALTER TABLE envelopes DROP CONSTRAINT envelopes_allocated_amt_nonneg;
