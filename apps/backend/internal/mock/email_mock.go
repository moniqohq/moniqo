package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
)

// MockEmailEnqueuer is a test double for email.Enqueuer.
type MockEmailEnqueuer struct {
	mock.Mock
}

func (m *MockEmailEnqueuer) Enqueue(_ context.Context, p email.EnqueueParams) error {
	args := m.Called(p)
	return args.Error(0)
}
