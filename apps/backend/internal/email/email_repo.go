package email

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
)

// Repo wraps sqlc Queries to provide the persistence operations the email
// service and worker need.
type Repo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

func NewRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
	return &Repo{pool: pool, log: log}
}

// Enqueue inserts an email job.  ON CONFLICT DO NOTHING makes this idempotent:
// duplicate idempotency keys are silently ignored.
func (r *Repo) Enqueue(ctx context.Context, p EnqueueParams) error {
	raw, err := json.Marshal(p.Payload)
	if err != nil {
		r.log.Error("failed to marshal email payload",
			zap.String("idempotency_key", p.IdempotencyKey),
			zap.String("template", string(p.Template)),
			zap.Error(err),
		)
		return fmt.Errorf("marshal email payload: %w", err)
	}

	maxAttempts := p.MaxAttempts
	if maxAttempts <= 0 {
		maxAttempts = 3
	}

	q := db.New(r.pool)
	if err := q.EnqueueEmailJob(ctx, db.EnqueueEmailJobParams{
		IdempotencyKey: p.IdempotencyKey,
		TemplateName:   string(p.Template),
		RecipientEmail: p.To,
		RecipientName:  p.ToName,
		Payload:        raw,
		MaxAttempts:    maxAttempts,
	}); err != nil {
		r.log.Error("failed to enqueue email job",
			zap.String("idempotency_key", p.IdempotencyKey),
			zap.String("template", string(p.Template)),
			zap.String("to", p.To),
			zap.Error(err),
		)
		return err
	}
	r.log.Debug("email job enqueued",
		zap.String("idempotency_key", p.IdempotencyKey),
		zap.String("template", string(p.Template)),
		zap.String("to", p.To),
	)
	return nil
}

// claimedJob is the internal representation returned by LockBatch.
type claimedJob struct {
	ID             pgtype.UUID
	TemplateName   TemplateName
	RecipientEmail string
	RecipientName  string
	Payload        []byte
	AttemptCount   int32
	MaxAttempts    int32
}

// LockBatch atomically claims up to n jobs for this worker by setting
// locked_by = workerID.  The UPDATE runs as a single implicit transaction so no
// long-lived lock is held during subsequent SMTP sends.  Jobs whose locked_by was
// set but never cleared more than 10 minutes ago are also eligible (crash
// recovery).
func (r *Repo) LockBatch(ctx context.Context, n int32, workerID string) ([]claimedJob, error) {
	q := db.New(r.pool)
	rows, err := q.LockEmailJobs(ctx, db.LockEmailJobsParams{
		Limit:    n,
		LockedBy: workerID,
	})
	if err != nil {
		r.log.Error("failed to lock email jobs", zap.Int32("limit", n), zap.Error(err))
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
	r.log.Debug("locked email jobs", zap.Int("count", len(jobs)), zap.Int32("limit", n))
	return jobs, nil
}

// MarkSent transitions a job to the sent state and clears locked_by.
func (r *Repo) MarkSent(ctx context.Context, id pgtype.UUID) error {
	if err := db.New(r.pool).MarkEmailJobSent(ctx, id); err != nil {
		r.log.Error("failed to mark email job sent",
			zap.String("job_id", uuid.UUID(id.Bytes).String()),
			zap.Error(err),
		)
		return err
	}
	r.log.Debug("email job marked sent", zap.String("job_id", uuid.UUID(id.Bytes).String()))
	return nil
}

// MarkFailed increments the attempt counter, schedules the next retry using
// exponential backoff (base * 2^attempt), and clears locked_by.  Once attempts
// are exhausted the job transitions to dead.
func (r *Repo) MarkFailed(ctx context.Context, id pgtype.UUID, errMsg string, attempt int32, baseBackoff time.Duration) error {
	delay := time.Duration(float64(baseBackoff) * math.Pow(2, float64(attempt)))
	next := pgtype.Timestamptz{Time: time.Now().Add(delay), Valid: true}
	errStr := errMsg
	if err := db.New(r.pool).MarkEmailJobFailed(ctx, db.MarkEmailJobFailedParams{
		ID:            id,
		LastError:     &errStr,
		NextAttemptAt: next,
	}); err != nil {
		r.log.Error("failed to mark email job failed",
			zap.String("job_id", uuid.UUID(id.Bytes).String()),
			zap.Int32("attempt", attempt),
			zap.Error(err),
		)
		return err
	}
	r.log.Debug("email job marked failed",
		zap.String("job_id", uuid.UUID(id.Bytes).String()),
		zap.Int32("attempt", attempt),
		zap.Duration("retry_delay", delay),
		zap.String("error", errMsg),
	)
	return nil
}
