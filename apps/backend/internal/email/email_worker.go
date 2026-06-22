package email

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"

	"github.com/google/uuid"
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
	workerID string
	log      *zap.Logger
	wg       sync.WaitGroup
}

// NewWorker returns a Worker wired to the given repository, email provider, and configuration.
func NewWorker(repo *Repo, provider providers.Provider, cfg WorkerConfig, log *zap.Logger) *Worker {
	return &Worker{
		repo:     repo,
		provider: provider,
		cfg:      cfg,
		workerID: fmt.Sprintf("worker-%d", os.Getpid()),
		log:      log,
	}
}

// Run starts the poll loop and blocks until ctx is canceled.  Call it in a
// goroutine from main.go.  The current tick (if any) drains before Run returns.
func (w *Worker) Run(ctx context.Context) {
	w.wg.Add(1)
	defer w.wg.Done()

	ticker := time.NewTicker(w.cfg.PollInterval)
	defer ticker.Stop()

	w.log.Info("email worker started",
		zap.Duration("poll_interval", w.cfg.PollInterval),
		zap.Int32("batch_size", w.cfg.BatchSize),
		zap.String("worker_id", w.workerID),
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

// Wait blocks until the current tick finishes after Run returns.
func (w *Worker) Wait() {
	w.wg.Wait()
}

// tick claims a batch via a short UPDATE (no long lock), then processes each
// job independently.  DB locks are held only for the brief LockBatch statement,
// not across SMTP I/O.
func (w *Worker) tick(ctx context.Context) {
	jobs, err := w.repo.LockBatch(ctx, w.cfg.BatchSize, w.workerID)
	if err != nil {
		w.log.Error("email worker: lock batch", zap.Error(err))
		return
	}
	if len(jobs) == 0 {
		return
	}

	for i := range jobs {
		w.processJob(ctx, &jobs[i])
	}
}

func (w *Worker) processJob(ctx context.Context, job *ClaimedJob) {
	log := w.log.With(
		zap.String("job_id", uuid.UUID(job.ID.Bytes).String()),
		zap.String("template", string(job.TemplateName)),
		zap.String("to", job.RecipientEmail),
	)

	var payload map[string]any
	if err := json.Unmarshal(job.Payload, &payload); err != nil {
		log.Error("email worker: unmarshal payload", zap.Error(err))
		w.failJob(ctx, job, err.Error(), log)
		return
	}

	out, err := renderTemplate(job.TemplateName, payload)
	if err != nil {
		log.Error("email worker: render template", zap.Error(err))
		w.failJob(ctx, job, err.Error(), log)
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
		w.failJob(ctx, job, err.Error(), log)
		return
	}

	if err := w.repo.MarkSent(ctx, job.ID); err != nil {
		log.Error("email worker: mark sent", zap.Error(err))
		return
	}
	log.Info("email sent successfully")
}

func (w *Worker) failJob(ctx context.Context, job *ClaimedJob, errMsg string, log *zap.Logger) {
	if err := w.repo.MarkFailed(ctx, job.ID, errMsg, job.AttemptCount, w.cfg.BaseBackoff); err != nil {
		log.Error("email worker: mark failed", zap.Error(err))
	}
	if job.AttemptCount+1 >= job.MaxAttempts {
		log.Warn("email job moved to dead letter", zap.Int32("max_attempts", job.MaxAttempts))
	}
}
