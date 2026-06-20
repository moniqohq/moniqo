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

// Enqueue records the call and returns the stubbed error.
func (m *MockEmailEnqueuer) Enqueue(_ context.Context, p email.EnqueueParams) error {
	args := m.Called(p)
	return args.Error(0)
}
