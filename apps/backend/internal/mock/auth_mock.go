package mock

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
)

// MockAuthRepository is a testify mock for auth.AuthRepository.
type MockAuthRepository struct {
	mock.Mock
}

func (m *MockAuthRepository) GetUserByEmail(_ context.Context, email string) (auth.UserCredentials, error) {
	args := m.Called(email)
	return args.Get(0).(auth.UserCredentials), args.Error(1)
}

func (m *MockAuthRepository) UpdateLastLogin(_ context.Context, userID int64) error {
	args := m.Called(userID)
	return args.Error(0)
}

func (m *MockAuthRepository) InsertRevokedAccessToken(_ context.Context, p auth.InsertRevokedTokenParams) error {
	args := m.Called(p)
	return args.Error(0)
}

func (m *MockAuthRepository) IsAccessTokenRevoked(_ context.Context, jti pgtype.UUID) (bool, error) {
	args := m.Called(jti)
	return args.Bool(0), args.Error(1)
}

func (m *MockAuthRepository) UserExistsByID(_ context.Context, userID int64) (bool, error) {
	args := m.Called(userID)
	return args.Bool(0), args.Error(1)
}
