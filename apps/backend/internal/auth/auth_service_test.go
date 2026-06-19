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

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
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

	t.Run("success returns access token, refresh token and Bearer type", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).
			Return(makeCredentials(validReq.Email, validReq.Password, models.UserStatusActive), nil)
		repo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		repo.On("UpdateLastLogin", int64(1)).Return(nil)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
		result, err := svc.Login(context.Background(), validReq)

		require.NoError(t, err)
		assert.NotEmpty(t, result.AccessToken)
		assert.Equal(t, "Bearer", result.TokenType)
		assert.NotEmpty(t, result.RefreshToken)
		repo.AssertExpectations(t)
	})

	t.Run("user not found returns ErrInvalidCredentials", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).Return(auth.UserCredentials{}, auth.ErrUserNotFound)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
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

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
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

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
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
		repo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		repo.On("UpdateLastLogin", int64(1)).Return(dbErr)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
		_, err := svc.Login(context.Background(), validReq)

		assert.ErrorIs(t, err, dbErr)
		repo.AssertExpectations(t)
	})

	t.Run("repo error propagates", func(t *testing.T) {
		t.Parallel()

		dbErr := errors.New("connection reset")
		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).Return(auth.UserCredentials{}, dbErr)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
		_, err := svc.Login(context.Background(), validReq)

		assert.ErrorIs(t, err, dbErr)
		repo.AssertExpectations(t)
	})

	t.Run("issued JWT has correct claims", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetUserByEmail", validReq.Email).
			Return(makeCredentials(validReq.Email, validReq.Password, models.UserStatusActive), nil)
		repo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		repo.On("UpdateLastLogin", int64(1)).Return(nil)

		svc := auth.NewAuthSvc(repo, testSecret, 30*time.Minute, 168*time.Hour, 720*time.Hour, log)
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
		repo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		repo.On("UpdateLastLogin", int64(1)).Return(nil)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
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

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
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

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
		err := svc.Logout(context.Background(), params)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("token invalidation failure propagates error", func(t *testing.T) {
		t.Parallel()

		dbErr := errors.New("db unavailable")
		repo := &internalmock.MockAuthRepository{}
		repo.On("InsertRevokedAccessToken", mock.AnythingOfType("InsertRevokedTokenParams")).Return(dbErr)

		svc := auth.NewAuthSvc(repo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
		err := svc.Logout(context.Background(), params)

		assert.ErrorIs(t, err, dbErr)
		repo.AssertExpectations(t)
	})
}

// makeRefreshTokenRow builds a db.RefreshToken for use in repo mocks.
func makeRefreshTokenRow(familyID, tokenID [16]byte, userID int64, now time.Time, ttl, maxAge time.Duration) db.RefreshToken {
	return db.RefreshToken{
		ID:                pgtype.UUID{Bytes: tokenID, Valid: true},
		FamilyID:          pgtype.UUID{Bytes: familyID, Valid: true},
		UserID:            userID,
		TokenHash:         "hash",
		IssuedAt:          pgtype.Timestamptz{Time: now, Valid: true},
		ExpiresAt:         pgtype.Timestamptz{Time: now.Add(ttl), Valid: true},
		AbsoluteExpiresAt: pgtype.Timestamptz{Time: now.Add(maxAge), Valid: true},
	}
}

func TestAuthSvc_RefreshAccessToken(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	const rawToken = "raw-token-value"
	familyID := uuid.New()
	tokenID := uuid.New()
	userID := int64(1)
	ttl := 168 * time.Hour
	maxAge := 720 * time.Hour

	newSvc := func(repo *internalmock.MockAuthRepository) *auth.AuthSvc {
		return auth.NewAuthSvc(repo, testSecret, 15*time.Minute, ttl, maxAge, log)
	}

	t.Run("happy path returns new access token and refresh token", func(t *testing.T) {
		t.Parallel()

		now := time.Now()
		row := makeRefreshTokenRow(familyID, tokenID, userID, now, ttl, maxAge)

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetRefreshTokenByHash", mock.Anything).Return(row, nil)
		repo.On("RotateRefreshToken", [16]byte(tokenID), mock.Anything).Return([16]byte{}, nil)

		result, err := newSvc(repo).RefreshAccessToken(context.Background(), rawToken)

		require.NoError(t, err)
		assert.NotEmpty(t, result.AccessToken)
		assert.Equal(t, "Bearer", result.TokenType)
		assert.NotEmpty(t, result.Refresh.RawToken)
		repo.AssertExpectations(t)
	})

	t.Run("unknown token hash returns ErrRefreshTokenInvalid", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetRefreshTokenByHash", mock.Anything).Return(db.RefreshToken{}, auth.ErrRefreshTokenInvalid)

		_, err := newSvc(repo).RefreshAccessToken(context.Background(), rawToken)

		assert.ErrorIs(t, err, auth.ErrRefreshTokenInvalid)
		repo.AssertExpectations(t)
	})

	t.Run("revoked token returns ErrRefreshTokenInvalid", func(t *testing.T) {
		t.Parallel()

		now := time.Now()
		row := makeRefreshTokenRow(familyID, tokenID, userID, now, ttl, maxAge)
		row.RevokedAt = pgtype.Timestamptz{Time: now.Add(-time.Minute), Valid: true}

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetRefreshTokenByHash", mock.Anything).Return(row, nil)

		_, err := newSvc(repo).RefreshAccessToken(context.Background(), rawToken)

		assert.ErrorIs(t, err, auth.ErrRefreshTokenInvalid)
		repo.AssertExpectations(t)
	})

	t.Run("expired token returns ErrRefreshTokenInvalid", func(t *testing.T) {
		t.Parallel()

		now := time.Now()
		row := makeRefreshTokenRow(familyID, tokenID, userID, now.Add(-2*ttl), ttl, maxAge)
		row.ExpiresAt = pgtype.Timestamptz{Time: now.Add(-time.Minute), Valid: true}

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetRefreshTokenByHash", mock.Anything).Return(row, nil)

		_, err := newSvc(repo).RefreshAccessToken(context.Background(), rawToken)

		assert.ErrorIs(t, err, auth.ErrRefreshTokenInvalid)
		repo.AssertExpectations(t)
	})

	t.Run("absolute cap exceeded returns ErrRefreshTokenInvalid", func(t *testing.T) {
		t.Parallel()

		now := time.Now()
		row := makeRefreshTokenRow(familyID, tokenID, userID, now, ttl, maxAge)
		row.AbsoluteExpiresAt = pgtype.Timestamptz{Time: now.Add(-time.Minute), Valid: true}

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetRefreshTokenByHash", mock.Anything).Return(row, nil)

		_, err := newSvc(repo).RefreshAccessToken(context.Background(), rawToken)

		assert.ErrorIs(t, err, auth.ErrRefreshTokenInvalid)
		repo.AssertExpectations(t)
	})

	t.Run("reuse detection revokes family and returns ErrRefreshTokenInvalid", func(t *testing.T) {
		t.Parallel()

		now := time.Now()
		row := makeRefreshTokenRow(familyID, tokenID, userID, now, ttl, maxAge)
		row.UsedAt = pgtype.Timestamptz{Time: now.Add(-time.Minute), Valid: true}

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetRefreshTokenByHash", mock.Anything).Return(row, nil)
		repo.On("RevokeRefreshTokenFamily", [16]byte(familyID), "reuse_detected").Return(nil)

		_, err := newSvc(repo).RefreshAccessToken(context.Background(), rawToken)

		assert.ErrorIs(t, err, auth.ErrRefreshTokenInvalid)
		repo.AssertCalled(t, "RevokeRefreshTokenFamily", [16]byte(familyID), "reuse_detected")
		repo.AssertExpectations(t)
	})

	t.Run("new expires_at clamped to absolute cap", func(t *testing.T) {
		t.Parallel()

		now := time.Now()
		// Absolute cap is only 1 hour away — less than the full TTL (168h).
		row := makeRefreshTokenRow(familyID, tokenID, userID, now, ttl, maxAge)
		row.AbsoluteExpiresAt = pgtype.Timestamptz{Time: now.Add(time.Hour), Valid: true}

		repo := &internalmock.MockAuthRepository{}
		repo.On("GetRefreshTokenByHash", mock.Anything).Return(row, nil)
		repo.On("RotateRefreshToken", [16]byte(tokenID), mock.MatchedBy(func(p auth.InsertRefreshTokenRepoParams) bool {
			// ExpiresAt must not exceed the absolute cap (now+1h).
			return !p.ExpiresAt.After(now.Add(time.Hour + time.Second))
		})).Return([16]byte{}, nil)

		result, err := newSvc(repo).RefreshAccessToken(context.Background(), rawToken)

		require.NoError(t, err)
		assert.True(t, result.Refresh.ExpiresAt.Before(now.Add(time.Hour+time.Second)),
			"new ExpiresAt should be clamped to absolute cap")
		repo.AssertExpectations(t)
	})
}
