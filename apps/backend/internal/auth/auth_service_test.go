package auth_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

var testSecret = []byte("test-secret-key-for-unit-tests")

func makeCredentials(email string, password string, status models.UserStatus) auth.UserCredentials {
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	return auth.UserCredentials{
		User: models.User{
			ID:       1,
			Username: "testuser",
			Email:    email,
			Status:   status,
		},
		Hash: string(hash),
	}
}

func TestAuthSvc_Login(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	validReq := auth.LoginRequest{
		Email:    "user@example.com",
		Password: "SecurePass1",
	}

	t.Run("success returns access token and Bearer type", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).
			Return(makeCredentials(validReq.Email, validReq.Password, models.UserStatusActive), nil)
		repo.On("UpdateLastLogin", int64(1)).Return(nil)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		result, err := svc.Login(context.Background(), validReq)

		require.NoError(t, err)
		assert.NotEmpty(t, result.AccessToken)
		assert.Equal(t, "Bearer", result.TokenType)
		repo.AssertExpectations(t)
	})

	t.Run("user not found returns ErrInvalidCredentials", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).Return(auth.UserCredentials{}, auth.ErrUserNotFound)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		_, err := svc.Login(context.Background(), validReq)

		assert.ErrorIs(t, err, auth.ErrInvalidCredentials)
		repo.AssertNotCalled(t, "UpdateLastLogin")
		repo.AssertExpectations(t)
	})

	t.Run("wrong password returns ErrInvalidCredentials", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).
			Return(makeCredentials(validReq.Email, "DifferentPass1", models.UserStatusActive), nil)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		req := validReq
		req.Password = "WrongPassXX"
		_, err := svc.Login(context.Background(), req)

		assert.ErrorIs(t, err, auth.ErrInvalidCredentials)
		repo.AssertNotCalled(t, "UpdateLastLogin")
		repo.AssertExpectations(t)
	})

	t.Run("pending verification returns ErrPendingVerification", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).
			Return(makeCredentials(validReq.Email, validReq.Password, models.UserStatusPendingVerification), nil)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		_, err := svc.Login(context.Background(), validReq)

		assert.ErrorIs(t, err, auth.ErrPendingVerification)
		repo.AssertNotCalled(t, "UpdateLastLogin")
		repo.AssertExpectations(t)
	})

	t.Run("UpdateLastLogin failure propagates error", func(t *testing.T) {
		t.Parallel()

		dbErr := errors.New("db unavailable")
		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).
			Return(makeCredentials(validReq.Email, validReq.Password, models.UserStatusActive), nil)
		repo.On("UpdateLastLogin", int64(1)).Return(dbErr)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		_, err := svc.Login(context.Background(), validReq)

		assert.ErrorIs(t, err, dbErr)
		repo.AssertExpectations(t)
	})

	t.Run("repo error propagates", func(t *testing.T) {
		t.Parallel()

		dbErr := errors.New("connection reset")
		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).Return(auth.UserCredentials{}, dbErr)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		_, err := svc.Login(context.Background(), validReq)

		assert.ErrorIs(t, err, dbErr)
		repo.AssertExpectations(t)
	})

	t.Run("issued JWT has correct claims", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).
			Return(makeCredentials(validReq.Email, validReq.Password, models.UserStatusActive), nil)
		repo.On("UpdateLastLogin", int64(1)).Return(nil)

		svc := auth.NewAuthSvc(repo, testSecret, 30*time.Minute, log)
		result, err := svc.Login(context.Background(), validReq)
		require.NoError(t, err)

		claims, err := auth.ParseAccessToken(result.AccessToken, testSecret)
		require.NoError(t, err)
		assert.Equal(t, "1", claims.Subject)
		assert.Equal(t, "moniqo", claims.Issuer)
		assert.NotEmpty(t, claims.ID)
		assert.WithinDuration(t, time.Now().Add(30*time.Minute), claims.ExpiresAt.Time, 5*time.Second)
	})

	t.Run("last_login is updated on successful login", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).
			Return(makeCredentials(validReq.Email, validReq.Password, models.UserStatusActive), nil)
		repo.On("UpdateLastLogin", int64(1)).Return(nil)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		_, err := svc.Login(context.Background(), validReq)

		require.NoError(t, err)
		repo.AssertCalled(t, "UpdateLastLogin", int64(1))
		repo.AssertExpectations(t)
	})
}

func TestAuthSvc_Logout(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	jti := uuid.New()
	params := auth.LogoutParams{
		JTI:       jti,
		UserID:    42,
		ExpiresAt: time.Now().Add(15 * time.Minute),
	}

	t.Run("success calls InsertRevokedAccessToken", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("InsertRevokedAccessToken", mock.AnythingOfType("InsertRevokedTokenParams")).Return(nil)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		err := svc.Logout(context.Background(), params)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("correct jti and user_id forwarded to repo", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("InsertRevokedAccessToken", mock.AnythingOfType("InsertRevokedTokenParams")).
			Return(nil).
			Run(func(args mock.Arguments) {
				p := args.Get(0).(auth.InsertRevokedTokenParams)
				assert.Equal(t, pgtype.UUID{Bytes: jti, Valid: true}, p.JTI)
				assert.Equal(t, int64(42), p.UserID)
			})

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		err := svc.Logout(context.Background(), params)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("token invalidation failure propagates error", func(t *testing.T) {
		t.Parallel()

		dbErr := errors.New("db unavailable")
		repo := &internalmock.MockAuthRepository{}
		repo.On("InsertRevokedAccessToken", mock.AnythingOfType("InsertRevokedTokenParams")).Return(dbErr)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, log)
		err := svc.Logout(context.Background(), params)

		assert.ErrorIs(t, err, dbErr)
		repo.AssertExpectations(t)
	})
}
