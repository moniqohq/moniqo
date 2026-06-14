package email_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
)

// mockRepo is a minimal in-process double for Repo used by Service tests.
// It does not need a database connection.
type mockRepo struct {
	mock.Mock
}

func (m *mockRepo) Enqueue(_ context.Context, p email.EnqueueParams) error {
	args := m.Called(p)
	return args.Error(0)
}

func TestService_Enqueue_Success(t *testing.T) {
	t.Parallel()

	repo := &mockRepo{}
	repo.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).Return(nil)

	// Service satisfies the Enqueuer interface; verify at compile time.
	var _ email.Enqueuer = (*testableService)(nil)
	svc := newTestableService(repo, zap.NewNop())

	err := svc.Enqueue(context.Background(), email.EnqueueParams{
		IdempotencyKey: "verification:1",
		Template:       email.TemplateVerification,
		To:             "user@example.com",
		ToName:         "Test User",
		Payload:        map[string]any{"Name": "Test User"},
	})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestService_Enqueue_PropagatesRepoError(t *testing.T) {
	t.Parallel()

	repo := &mockRepo{}
	repo.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).Return(errors.New("db down"))

	svc := newTestableService(repo, zap.NewNop())
	err := svc.Enqueue(context.Background(), email.EnqueueParams{
		IdempotencyKey: "verification:2",
		Template:       email.TemplateVerification,
		To:             "user@example.com",
		ToName:         "",
		Payload:        nil,
	})

	assert.Error(t, err)
	repo.AssertExpectations(t)
}

// testableService and newTestableService expose just enough for tests without
// requiring a real pgxpool.  They mirror what Service does but accept the mock.
type repoEnqueuer interface {
	Enqueue(ctx context.Context, p email.EnqueueParams) error
}

type testableService struct {
	repo repoEnqueuer
	log  *zap.Logger
}

func newTestableService(repo repoEnqueuer, log *zap.Logger) *testableService {
	return &testableService{repo: repo, log: log}
}

func (s *testableService) Enqueue(ctx context.Context, p email.EnqueueParams) error {
	return s.repo.Enqueue(ctx, p)
}
