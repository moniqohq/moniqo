package auth

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Sentinel errors returned by the auth service and repository layers.
var (
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrPendingVerification = errors.New("account pending verification")
	ErrUserNotFound        = errors.New("user not found")
	// ErrRefreshTokenInvalid is the single generic error returned for any
	// refresh token failure (absent, expired, revoked, malformed, reuse). The
	// handler maps it to 401 without revealing the specific cause.
	ErrRefreshTokenInvalid = errors.New("refresh token invalid")
)

// -----------------------------------------------------------------------------
// Handler layer
// -----------------------------------------------------------------------------

// LoginRequest is the HTTP request body for POST /auth/login and the
// service-layer input to AuthSvc.Login.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginResponseData is the HTTP response body for a successful login.
type LoginResponseData struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	RefreshToken string `json:"refresh_token"`
}

// -----------------------------------------------------------------------------
// Service layer
// -----------------------------------------------------------------------------

// LoginResult holds the data returned on a successful login.
type LoginResult struct {
	AccessToken  string
	TokenType    string
	RefreshToken string
}

// RefreshIssue holds the raw refresh token and its expiry returned by IssueRefreshToken.
type RefreshIssue struct {
	RawToken  string
	ExpiresAt time.Time
}

// RefreshResult is returned by RefreshAccessToken on a successful rotation.
type RefreshResult struct {
	AccessToken string
	TokenType   string
	Refresh     RefreshIssue
}

// LogoutParams carries the claims extracted from the current access token.
type LogoutParams struct {
	JTI       uuid.UUID
	UserID    int64
	ExpiresAt time.Time
}

// -----------------------------------------------------------------------------
// Repository layer
// -----------------------------------------------------------------------------

// UserCredentials bundles the public-safe user model with the bcrypt hash
// needed for password verification. The hash is never forwarded beyond the
// service layer.
type UserCredentials struct {
	User models.User
	Hash string
}

// InsertRevokedTokenParams carries the values for a new blocklist entry.
type InsertRevokedTokenParams struct {
	JTI       pgtype.UUID
	UserID    int64
	ExpiresAt time.Time
}

// InsertRefreshTokenRepoParams carries the values for a new refresh token row.
type InsertRefreshTokenRepoParams struct {
	FamilyID          [16]byte
	UserID            int64
	TokenHash         string
	ExpiresAt         time.Time
	AbsoluteExpiresAt time.Time
}
