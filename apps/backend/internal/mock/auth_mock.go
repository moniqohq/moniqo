package mock

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/mock"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
)

// MockAuthService is a test double for auth.AuthService.
type MockAuthService struct {
	LoginFn              func(ctx context.Context, req auth.LoginRequest) (auth.LoginResult, error)
	LogoutFn             func(ctx context.Context, params auth.LogoutParams) error
	RefreshAccessTokenFn func(ctx context.Context, rawToken string) (auth.RefreshResult, error)
}

func (m *MockAuthService) Login(ctx context.Context, req auth.LoginRequest) (auth.LoginResult, error) {
	return m.LoginFn(ctx, req)
}

func (m *MockAuthService) Logout(ctx context.Context, params auth.LogoutParams) error {
	return m.LogoutFn(ctx, params)
}

func (m *MockAuthService) RefreshAccessToken(ctx context.Context, rawToken string) (auth.RefreshResult, error) {
	return m.RefreshAccessTokenFn(ctx, rawToken)
}

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

func (m *MockAuthRepository) InsertRefreshToken(_ context.Context, p auth.InsertRefreshTokenRepoParams) ([16]byte, error) {
	args := m.Called(p)
	return args.Get(0).([16]byte), args.Error(1)
}

func (m *MockAuthRepository) GetRefreshTokenByHash(_ context.Context, hash string) (db.RefreshToken, error) {
	args := m.Called(hash)
	return args.Get(0).(db.RefreshToken), args.Error(1)
}

func (m *MockAuthRepository) MarkRefreshTokenUsed(_ context.Context, id [16]byte) error {
	args := m.Called(id)
	return args.Error(0)
}

func (m *MockAuthRepository) RevokeRefreshTokenFamily(_ context.Context, familyID [16]byte, reason string) error {
	args := m.Called(familyID, reason)
	return args.Error(0)
}

func (m *MockAuthRepository) RotateRefreshToken(_ context.Context, oldID [16]byte, p auth.InsertRefreshTokenRepoParams) ([16]byte, error) {
	args := m.Called(oldID, p)
	return args.Get(0).([16]byte), args.Error(1)
}
