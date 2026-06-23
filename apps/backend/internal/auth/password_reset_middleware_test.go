package auth_test

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	mockpkg "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

func TestMiddleware_TokenEpoch(t *testing.T) {
	t.Parallel()

	t.Run("token issued before epoch is rejected", func(t *testing.T) {
		t.Parallel()

		token, _, err := auth.GenerateAccessToken(1, mwSecret, 15*time.Minute)
		require.NoError(t, err)

		epoch := time.Now().Add(time.Second)
		userWithEpoch := activeUser()
		userWithEpoch.TokensInvalidBefore = &epoch

		repo := &mockpkg.AuthRepository{}
		repo.On("IsAccessTokenRevoked", mock.Anything).Return(false, nil)
		repo.On("GetUserByID", int64(1)).Return(userWithEpoch, nil)

		rec, handlerRan, _ := runMiddleware(t, repo, "Bearer "+token, true)

		assert.Equal(t, http.StatusUnauthorized, rec.Code)
		assert.False(t, handlerRan)
	})

	t.Run("token issued after epoch is accepted", func(t *testing.T) {
		t.Parallel()

		epoch := time.Now().Add(-time.Hour)
		userWithEpoch := activeUser()
		userWithEpoch.TokensInvalidBefore = &epoch

		token, _, err := auth.GenerateAccessToken(1, mwSecret, 15*time.Minute)
		require.NoError(t, err)

		repo := &mockpkg.AuthRepository{}
		repo.On("IsAccessTokenRevoked", mock.Anything).Return(false, nil)
		repo.On("GetUserByID", int64(1)).Return(userWithEpoch, nil)

		rec, handlerRan, _ := runMiddleware(t, repo, "Bearer "+token, true)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.True(t, handlerRan)
	})

	t.Run("nil epoch does not block valid token", func(t *testing.T) {
		t.Parallel()

		userNoEpoch := activeUser()

		token, _, err := auth.GenerateAccessToken(1, mwSecret, 15*time.Minute)
		require.NoError(t, err)

		repo := &mockpkg.AuthRepository{}
		repo.On("IsAccessTokenRevoked", mock.Anything).Return(false, nil)
		repo.On("GetUserByID", int64(1)).Return(userNoEpoch, nil)

		rec, handlerRan, _ := runMiddleware(t, repo, "Bearer "+token, true)

		assert.Equal(t, http.StatusOK, rec.Code)
		assert.True(t, handlerRan)
	})
}

func TestGeneratePasswordResetToken(t *testing.T) {
	t.Parallel()

	raw, hash, err := auth.GeneratePasswordResetToken()
	require.NoError(t, err)
	assert.Len(t, raw, 64, "raw token must be 64 hex chars")
	assert.Regexp(t, `^[0-9a-f]{64}$`, raw)
	assert.Len(t, hash, 64, "SHA-256 hex digest is always 64 chars")
	assert.NotEqual(t, raw, hash)

	raw2, _, err := auth.GeneratePasswordResetToken()
	require.NoError(t, err)
	assert.NotEqual(t, raw, raw2, "two calls must produce distinct tokens")
}

func TestPasswordResetSvc_PendingVerificationUserAllowed(t *testing.T) {
	t.Parallel()

	repo := &mockpkg.PasswordResetRepository{}
	mailer := &mockpkg.EmailEnqueuer{}

	user := auth.PasswordResetUserInfo{ID: 7, Name: nil, Email: "pv@example.com"}
	repo.On("GetUserForPasswordReset", "pv@example.com").Return(user, nil)
	repo.On("InvalidateUserPasswordResetTokens", int64(7)).Return(nil)
	repo.On("InsertPasswordResetToken", int64(7), mock.AnythingOfType("string"), mock.AnythingOfType("time.Time")).Return(nil)
	mailer.On("Enqueue", mock.Anything).Return(nil)

	svc := auth.NewPasswordResetSvc(repo, mailer, 4, time.Hour, "http://localhost:3000", zap.NewNop())
	err := svc.RequestReset(context.Background(), auth.RequestResetRequest{Email: "pv@example.com"})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestModelsUser_TokensInvalidBefore_NotSerialized(t *testing.T) {
	t.Parallel()

	epoch := time.Now()
	u := models.User{
		ID:                  1,
		Username:            "alice",
		Email:               "alice@example.com",
		TokensInvalidBefore: &epoch,
	}
	b, err := json.Marshal(u)
	require.NoError(t, err)
	assert.NotContains(t, string(b), "tokens_invalid_before")
	assert.NotContains(t, string(b), "TokensInvalidBefore")
}
