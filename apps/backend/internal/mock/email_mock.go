package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
)

// EmailEnqueuer is a test double for email.Enqueuer.
type EmailEnqueuer struct {
	mock.Mock
}

// Enqueue records the call and returns the stubbed error.
func (m *EmailEnqueuer) Enqueue(_ context.Context, p email.EnqueueParams) error {
	args := m.Called(p)
	return args.Error(0)
}
