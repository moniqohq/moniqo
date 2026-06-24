package auth_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	mockpkg "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

var mwSecret = []byte("middleware-test-secret")

func activeUser() models.User {
	return models.User{ID: 1, Username: "alice", Email: "alice@example.com", Status: models.UserStatusActive}
}

// runMiddleware executes the auth middleware against a GET /api/v1/users/1 request
// carrying the given Authorization header, returning the recorder and whether the
// downstream handler ran (with the user it observed in context).
func runMiddleware(
	t *testing.T,
	repo auth.Repository,
	authHeader string,
	setHeader bool,
) (*httptest.ResponseRecorder, bool, *models.User) {
	t.Helper()

	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/1", nil)
	if setHeader {
		req.Header.Set(echo.HeaderAuthorization, authHeader)
	}
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	var (
		handlerRan bool
		gotUser    *models.User
	)
	next := func(c echo.Context) error {
		handlerRan = true
		if u, ok := auth.UserFromContext(c); ok {
			gotUser = u
		}
		return c.NoContent(http.StatusOK)
	}

	mw := auth.Middleware(repo, mwSecret, zap.NewNop(), nil)
	// Reject paths write the response envelope and also return an echo error to
	// stop the chain; in real serving Echo skips the committed response. We only
	// assert on the recorder, so the returned error is intentionally ignored.
	_ = mw(next)(c)
	return rec, handlerRan, gotUser
}

func TestMiddleware(t *testing.T) {
	t.Parallel()

	validToken, _, err := auth.GenerateAccessToken(1, mwSecret, 15*time.Minute)
	require.NoError(t, err)
	expiredToken, _, err := auth.GenerateAccessToken(1, mwSecret, -time.Minute)
	require.NoError(t, err)
	revokedToken, _, err := auth.GenerateAccessToken(1, mwSecret, 15*time.Minute)
	require.NoError(t, err)
	unknownUserToken, _, err := auth.GenerateAccessToken(99, mwSecret, 15*time.Minute)
	require.NoError(t, err)

	tests := []struct {
		name        string
		header      string
		setHeader   bool
		setupRepo   func(r *mockpkg.AuthRepository)
		wantStatus  int
		wantHandler bool
	}{
		{
			name:      "valid token, active user",
			header:    "Bearer " + validToken,
			setHeader: true,
			setupRepo: func(r *mockpkg.AuthRepository) {
				r.On("IsAccessTokenRevoked", mock.Anything).Return(false, nil)
				r.On("GetUserByID", int64(1)).Return(activeUser(), nil)
			},
			wantStatus:  http.StatusOK,
			wantHandler: true,
		},
		{
			name:        "missing authorization header",
			setHeader:   false,
			setupRepo:   func(_ *mockpkg.AuthRepository) {},
			wantStatus:  http.StatusUnauthorized,
			wantHandler: false,
		},
		{
			name:        "no bearer prefix",
			header:      validToken,
			setHeader:   true,
			setupRepo:   func(_ *mockpkg.AuthRepository) {},
			wantStatus:  http.StatusUnauthorized,
			wantHandler: false,
		},
		{
			name:        "malformed token",
			header:      "Bearer not-a-jwt",
			setHeader:   true,
			setupRepo:   func(_ *mockpkg.AuthRepository) {},
			wantStatus:  http.StatusUnauthorized,
			wantHandler: false,
		},
		{
			name:        "expired token",
			header:      "Bearer " + expiredToken,
			setHeader:   true,
			setupRepo:   func(_ *mockpkg.AuthRepository) {},
			wantStatus:  http.StatusUnauthorized,
			wantHandler: false,
		},
		{
			name:      "jti in blocklist",
			header:    "Bearer " + revokedToken,
			setHeader: true,
			setupRepo: func(r *mockpkg.AuthRepository) {
				r.On("IsAccessTokenRevoked", mock.Anything).Return(true, nil)
			},
			wantStatus:  http.StatusUnauthorized,
			wantHandler: false,
		},
		{
			name:      "sub does not match any user",
			header:    "Bearer " + unknownUserToken,
			setHeader: true,
			setupRepo: func(r *mockpkg.AuthRepository) {
				r.On("IsAccessTokenRevoked", mock.Anything).Return(false, nil)
				r.On("GetUserByID", int64(99)).Return(models.User{}, auth.ErrUserNotFound)
			},
			wantStatus:  http.StatusUnauthorized,
			wantHandler: false,
		},
		{
			name:      "user is soft-deleted",
			header:    "Bearer " + validToken,
			setHeader: true,
			setupRepo: func(r *mockpkg.AuthRepository) {
				// The GetUserByID query filters deleted_at, so a soft-deleted
				// user surfaces as ErrUserNotFound.
				r.On("IsAccessTokenRevoked", mock.Anything).Return(false, nil)
				r.On("GetUserByID", int64(1)).Return(models.User{}, auth.ErrUserNotFound)
			},
			wantStatus:  http.StatusUnauthorized,
			wantHandler: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			repo := &mockpkg.AuthRepository{}
			tc.setupRepo(repo)

			rec, handlerRan, gotUser := runMiddleware(t, repo, tc.header, tc.setHeader)

			assert.Equal(t, tc.wantStatus, rec.Code)
			assert.Equal(t, tc.wantHandler, handlerRan)

			if tc.wantHandler {
				require.NotNil(t, gotUser)
				assert.Equal(t, int64(1), gotUser.ID)
			} else {
				resp, _ := parseEnvelope(t, rec.Body.String())
				assert.False(t, resp.Success)
				assert.Equal(t, "unauthorized", resp.Msg)
			}
		})
	}
}

// TestMiddlewareSkipperBypass verifies that when the skipper matches, the request
// reaches the handler without any Authorization header or repository calls.
func TestMiddlewareSkipperBypass(t *testing.T) {
	t.Parallel()

	e := echo.New()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/users", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	handlerRan := false
	next := func(c echo.Context) error {
		handlerRan = true
		return c.NoContent(http.StatusCreated)
	}

	skipper := func(_ echo.Context) bool { return true }
	mw := auth.Middleware(&mockpkg.AuthRepository{}, mwSecret, zap.NewNop(), skipper)
	require.NoError(t, mw(next)(c))

	assert.True(t, handlerRan)
	assert.Equal(t, http.StatusCreated, rec.Code)
}

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
