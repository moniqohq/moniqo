package email

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/email/providers"
)

// WorkerConfig holds the tunables for the background send loop.
type WorkerConfig struct {
	// PollInterval is how often the worker checks for pending jobs.
	PollInterval time.Duration
	// BatchSize is the maximum number of jobs claimed per poll tick.
	BatchSize int32
	// BaseBackoff is multiplied by 2^attempt to compute the next retry delay.
	BaseBackoff time.Duration
	// FromAddress is injected into every outbound message.
	FromAddress string
	// FromName is the display name in the From header.
	FromName string
}

// Worker polls the email_jobs table and sends pending messages via the provider.
type Worker struct {
	repo     *Repo
	provider providers.Provider
	cfg      WorkerConfig
	log      *zap.Logger
}

func NewWorker(repo *Repo, provider providers.Provider, cfg WorkerConfig, log *zap.Logger) *Worker {
	return &Worker{repo: repo, provider: provider, cfg: cfg, log: log}
}

// Run starts the poll loop and blocks until ctx is cancelled.  Call it in a
// goroutine from main.go; the loop drains any in-flight batch before returning.
func (w *Worker) Run(ctx context.Context) {
	ticker := time.NewTicker(w.cfg.PollInterval)
	defer ticker.Stop()

	w.log.Info("email worker started",
		zap.Duration("poll_interval", w.cfg.PollInterval),
		zap.Int32("batch_size", w.cfg.BatchSize),
	)

	for {
		select {
		case <-ctx.Done():
			w.log.Info("email worker stopped")
			return
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

// tick claims a batch and processes each job within a single transaction.
// If the process crashes mid-flight the transaction rolls back automatically
// (connection drop = implicit rollback), leaving jobs in their prior state.
func (w *Worker) tick(ctx context.Context) {
	tx, err := w.repo.BeginTx(ctx)
	if err != nil {
		w.log.Error("email worker: begin tx", zap.Error(err))
		return
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	jobs, err := w.repo.ClaimBatch(ctx, tx, w.cfg.BatchSize)
	if err != nil {
		w.log.Error("email worker: claim batch", zap.Error(err))
		return
	}
	if len(jobs) == 0 {
		return
	}

	for i := range jobs {
		w.processJob(ctx, tx, &jobs[i])
	}

	if err := tx.Commit(ctx); err != nil {
		w.log.Error("email worker: commit tx", zap.Error(err))
	}
}

func (w *Worker) processJob(ctx context.Context, tx pgx.Tx, job *claimedJob) {
	log := w.log.With(
		zap.String("job_id", pgxUUIDString(job.ID.Bytes)),
		zap.String("template", string(job.TemplateName)),
		zap.String("to", job.RecipientEmail),
	)

	var payload map[string]any
	if err := json.Unmarshal(job.Payload, &payload); err != nil {
		log.Error("email worker: unmarshal payload", zap.Error(err))
		w.failJob(ctx, tx, job, err.Error(), log)
		return
	}

	out, err := renderTemplate(job.TemplateName, payload)
	if err != nil {
		log.Error("email worker: render template", zap.Error(err))
		w.failJob(ctx, tx, job, err.Error(), log)
		return
	}

	if err := w.provider.Send(ctx, providers.Message{
		To:       job.RecipientEmail,
		ToName:   job.RecipientName,
		Subject:  out.Subject,
		HTMLBody: out.HTMLBody,
		TextBody: out.TextBody,
	}); err != nil {
		log.Warn("email worker: send failed, will retry",
			zap.Int32("attempt", job.AttemptCount+1),
			zap.Int32("max_attempts", job.MaxAttempts),
			zap.Error(err),
		)
		w.failJob(ctx, tx, job, err.Error(), log)
		return
	}

	if err := w.repo.MarkSent(ctx, tx, job.ID); err != nil {
		log.Error("email worker: mark sent", zap.Error(err))
		return
	}
	log.Info("email sent successfully")
}

func (w *Worker) failJob(ctx context.Context, tx pgx.Tx, job *claimedJob, errMsg string, log *zap.Logger) {
	if err := w.repo.MarkFailed(ctx, tx, job.ID, errMsg, job.AttemptCount, w.cfg.BaseBackoff); err != nil {
		log.Error("email worker: mark failed", zap.Error(err))
	}
	if job.AttemptCount+1 >= job.MaxAttempts {
		log.Warn("email job moved to dead letter", zap.Int32("max_attempts", job.MaxAttempts))
	}
}

func pgxUUIDString(b [16]byte) string {
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
