package email

import (
	"context"

	"go.uber.org/zap"
)

// Service implements Enqueuer by persisting email jobs to PostgreSQL.
type Service struct {
	repo *Repo
	log  *zap.Logger
}

func NewService(repo *Repo, log *zap.Logger) *Service {
	return &Service{repo: repo, log: log}
}

func (s *Service) Enqueue(ctx context.Context, p EnqueueParams) error {
	if err := s.repo.Enqueue(ctx, p); err != nil {
		s.log.Error("failed to enqueue email job",
			zap.String("idempotency_key", p.IdempotencyKey),
			zap.String("template", string(p.Template)),
			zap.String("to", p.To),
			zap.Error(err),
		)
		return err
	}
	s.log.Debug("email job enqueued",
		zap.String("idempotency_key", p.IdempotencyKey),
		zap.String("template", string(p.Template)),
		zap.String("to", p.To),
	)
	return nil
}
