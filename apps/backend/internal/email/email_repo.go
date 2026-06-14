package email

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
)

// Repo wraps sqlc Queries to provide the persistence operations the email
// service and worker need.
type Repo struct {
	pool *pgxpool.Pool
}

func NewRepo(pool *pgxpool.Pool) *Repo {
	return &Repo{pool: pool}
}

// Enqueue inserts an email job.  ON CONFLICT DO NOTHING makes this idempotent:
// duplicate idempotency keys are silently ignored.
func (r *Repo) Enqueue(ctx context.Context, p EnqueueParams) error {
	raw, err := json.Marshal(p.Payload)
	if err != nil {
		return fmt.Errorf("marshal email payload: %w", err)
	}

	q := db.New(r.pool)
	return q.EnqueueEmailJob(ctx, db.EnqueueEmailJobParams{
		IdempotencyKey: p.IdempotencyKey,
		TemplateName:   string(p.Template),
		RecipientEmail: p.To,
		RecipientName:  p.ToName,
		Payload:        raw,
		MaxAttempts:    3,
	})
}

// claimedJob is the internal representation returned by ClaimBatch.
type claimedJob struct {
	ID             pgtype.UUID
	TemplateName   TemplateName
	RecipientEmail string
	RecipientName  string
	Payload        []byte
	AttemptCount   int32
	MaxAttempts    int32
}

// ClaimBatch claims up to n jobs for processing using FOR UPDATE SKIP LOCKED
// inside a single transaction.  The caller is responsible for calling MarkSent
// or MarkFailed within the same transaction before committing.
func (r *Repo) ClaimBatch(ctx context.Context, tx pgx.Tx, n int32) ([]claimedJob, error) {
	q := db.New(tx)
	rows, err := q.ClaimEmailJobs(ctx, n)
	if err != nil {
		return nil, err
	}
	jobs := make([]claimedJob, len(rows))
	for i, row := range rows {
		jobs[i] = claimedJob{
			ID:             row.ID,
			TemplateName:   TemplateName(row.TemplateName),
			RecipientEmail: row.RecipientEmail,
			RecipientName:  row.RecipientName,
			Payload:        row.Payload,
			AttemptCount:   row.AttemptCount,
			MaxAttempts:    row.MaxAttempts,
		}
	}
	return jobs, nil
}

// MarkSent transitions a job to the sent state.
func (r *Repo) MarkSent(ctx context.Context, tx pgx.Tx, id pgtype.UUID) error {
	return db.New(tx).MarkEmailJobSent(ctx, id)
}

// MarkFailed increments the attempt counter and schedules the next retry using
// exponential backoff (base * 2^attempt).  Once attempts are exhausted the job
// transitions to dead.
func (r *Repo) MarkFailed(ctx context.Context, tx pgx.Tx, id pgtype.UUID, errMsg string, attempt int32, baseBackoff time.Duration) error {
	delay := time.Duration(float64(baseBackoff) * math.Pow(2, float64(attempt)))
	next := pgtype.Timestamptz{Time: time.Now().Add(delay), Valid: true}
	errStr := errMsg
	return db.New(tx).MarkEmailJobFailed(ctx, db.MarkEmailJobFailedParams{
		ID:            id,
		LastError:     &errStr,
		NextAttemptAt: next,
	})
}

// BeginTx opens a new transaction on the pool.
func (r *Repo) BeginTx(ctx context.Context) (pgx.Tx, error) {
	return r.pool.Begin(ctx)
}
