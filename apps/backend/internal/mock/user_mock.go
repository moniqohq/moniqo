package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

// MockUserService is a test double for user.UserService.
type MockUserService struct {
	RegisterFn       func(ctx context.Context, req user.RegisterRequest) (models.User, error)
	GetByIDFn        func(ctx context.Context, id int64) (models.User, error)
	ReplaceProfileFn func(ctx context.Context, id int64, req user.ReplaceProfileRequest) (models.User, error)
	PatchProfileFn   func(ctx context.Context, id int64, req user.PatchProfileRequest) (models.User, error)
	DeleteFn         func(ctx context.Context, id int64) error
}

func (m *MockUserService) Register(ctx context.Context, req user.RegisterRequest) (models.User, error) {
	return m.RegisterFn(ctx, req)
}

func (m *MockUserService) GetByID(ctx context.Context, id int64) (models.User, error) {
	return m.GetByIDFn(ctx, id)
}

func (m *MockUserService) ReplaceProfile(ctx context.Context, id int64, req user.ReplaceProfileRequest) (models.User, error) {
	return m.ReplaceProfileFn(ctx, id, req)
}

func (m *MockUserService) PatchProfile(ctx context.Context, id int64, req user.PatchProfileRequest) (models.User, error) {
	return m.PatchProfileFn(ctx, id, req)
}

func (m *MockUserService) Delete(ctx context.Context, id int64) error {
	return m.DeleteFn(ctx, id)
}

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(_ context.Context, p user.CreateParams) (models.User, error) {
	args := m.Called(p)
	return args.Get(0).(models.User), args.Error(1)
}

func (m *MockUserRepository) GetByID(_ context.Context, id int64) (models.User, error) {
	args := m.Called(id)
	return args.Get(0).(models.User), args.Error(1)
}

func (m *MockUserRepository) UpdateProfile(_ context.Context, p user.UpdateProfileParams) (models.User, error) {
	args := m.Called(p)
	return args.Get(0).(models.User), args.Error(1)
}

func (m *MockUserRepository) UpdatePassword(_ context.Context, id int64, hash string) error {
	args := m.Called(id, hash)
	return args.Error(0)
}

func (m *MockUserRepository) SoftDelete(_ context.Context, id int64) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockUserRepository) GetHashByID(_ context.Context, id int64) (string, error) {
	args := m.Called(id)
	return args.String(0), args.Error(1)
}
