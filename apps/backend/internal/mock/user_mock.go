package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

// UserService is a test double for user.Service.
type UserService struct {
	RegisterFn       func(ctx context.Context, req user.RegisterRequest) (models.User, error)
	GetByIDFn        func(ctx context.Context, id int64) (models.User, error)
	ReplaceProfileFn func(ctx context.Context, id int64, req user.ReplaceProfileRequest) (models.User, error)
	PatchProfileFn   func(ctx context.Context, id int64, req user.PatchProfileRequest) (models.User, error)
	DeleteFn         func(ctx context.Context, id int64) error
}

// Register delegates to RegisterFn.
func (m *UserService) Register(ctx context.Context, req user.RegisterRequest) (models.User, error) {
	return m.RegisterFn(ctx, req)
}

// GetByID delegates to GetByIDFn.
func (m *UserService) GetByID(ctx context.Context, id int64) (models.User, error) {
	return m.GetByIDFn(ctx, id)
}

// ReplaceProfile delegates to ReplaceProfileFn.
func (m *UserService) ReplaceProfile(ctx context.Context, id int64, req user.ReplaceProfileRequest) (models.User, error) {
	return m.ReplaceProfileFn(ctx, id, req)
}

// PatchProfile delegates to PatchProfileFn.
func (m *UserService) PatchProfile(ctx context.Context, id int64, req user.PatchProfileRequest) (models.User, error) {
	return m.PatchProfileFn(ctx, id, req)
}

// Delete delegates to DeleteFn.
func (m *UserService) Delete(ctx context.Context, id int64) error {
	return m.DeleteFn(ctx, id)
}

// UserRepository is a testify mock for user.Repository.
type UserRepository struct {
	mock.Mock
}

// Create records the call and returns the configured stub values.
func (m *UserRepository) Create(_ context.Context, p user.CreateParams) (models.User, error) {
	args := m.Called(p)
	u, ok := args.Get(0).(models.User)
	if !ok {
		return models.User{}, args.Error(1)
	}
	return u, args.Error(1)
}

// GetByID records the call and returns the configured stub values.
func (m *UserRepository) GetByID(_ context.Context, id int64) (models.User, error) {
	args := m.Called(id)
	u, ok := args.Get(0).(models.User)
	if !ok {
		return models.User{}, args.Error(1)
	}
	return u, args.Error(1)
}

// UpdateProfile records the call and returns the configured stub values.
func (m *UserRepository) UpdateProfile(_ context.Context, p user.UpdateProfileParams) (models.User, error) {
	args := m.Called(p)
	u, ok := args.Get(0).(models.User)
	if !ok {
		return models.User{}, args.Error(1)
	}
	return u, args.Error(1)
}

// UpdatePassword records the call and returns the configured stub error.
func (m *UserRepository) UpdatePassword(_ context.Context, id int64, hash string) error {
	args := m.Called(id, hash)
	return args.Error(0)
}

// SoftDelete records the call and returns the configured stub error.
func (m *UserRepository) SoftDelete(_ context.Context, id int64) error {
	args := m.Called(id)
	return args.Error(0)
}

// GetHashByID records the call and returns the configured stub values.
func (m *UserRepository) GetHashByID(_ context.Context, id int64) (string, error) {
	args := m.Called(id)
	return args.String(0), args.Error(1)
}
