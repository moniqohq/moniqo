package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

// MockUserService is a test double for user.UserService.
type MockUserService struct {
	RegisterFn func(ctx context.Context, req user.RegisterRequest) (models.User, error)
}

func (m *MockUserService) Register(ctx context.Context, req user.RegisterRequest) (models.User, error) {
	return m.RegisterFn(ctx, req)
}

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(_ context.Context, p user.CreateParams) (models.User, error) {
	args := m.Called(p)
	return args.Get(0).(models.User), args.Error(1)
}
