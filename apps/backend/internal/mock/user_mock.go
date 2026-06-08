package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(_ context.Context, p user.CreateParams) (models.User, error) {
	args := m.Called(p)
	return args.Get(0).(models.User), args.Error(1)
}
