package email

import "context"

// Service implements Enqueuer by persisting email jobs to PostgreSQL.
type Service struct {
	repo *Repo
}

func NewService(repo *Repo) *Service {
	return &Service{repo: repo}
}

func (s *Service) Enqueue(ctx context.Context, p EnqueueParams) error {
	return s.repo.Enqueue(ctx, p)
}
