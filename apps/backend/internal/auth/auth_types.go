package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Sentinel errors returned by the auth service and repository layers.
var (
	ErrInvalidCredentials  = errors.New("invalid credentials")          // wrong username or password
	ErrPendingVerification = errors.New("account pending verification") // email not yet confirmed
	ErrUserNotFound        = errors.New("user not found")               // no account matches the lookup key
	// ErrRefreshTokenInvalid is the single generic error returned for any
	// refresh token failure (absent, expired, revoked, malformed, reuse). The
	// handler maps it to 401 without revealing the specific cause.
	ErrRefreshTokenInvalid = errors.New("refresh token invalid")
	// ErrInvalidResetToken is the single generic error returned for any password
	// reset token failure (not found, already used, expired). The handler maps
	// it to 401 without revealing the specific cause.
	ErrInvalidResetToken = errors.New("reset token invalid")
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

// LogoutParams carries the claims extracted from the current access token and,
// optionally, the SHA-256 hash of the refresh token to revoke atomically.
// If RefreshTokenHash is empty, only the access token is blocklisted.
type LogoutParams struct {
	JTI              uuid.UUID
	UserID           int64
	ExpiresAt        time.Time
	RefreshTokenHash string
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

// -----------------------------------------------------------------------------
// Password reset types
// -----------------------------------------------------------------------------

// RequestResetRequest is the HTTP request body and service-layer input for initiating a password reset.
type RequestResetRequest struct {
	Email string `json:"email"`
}

// ConfirmResetRequest is the HTTP request body and service-layer input for confirming a password reset.
type ConfirmResetRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

// PasswordResetUserInfo holds the minimum user data needed for token issuance and email.
type PasswordResetUserInfo struct {
	ID    int64
	Name  *string
	Email string
}

// PasswordResetTokenRow is the internal representation of a password_reset_tokens row.
type PasswordResetTokenRow struct {
	ID        [16]byte
	UserID    int64
	ExpiresAt time.Time
	UsedAt    *time.Time
}

// ConfirmResetTxParams carries everything needed to atomically confirm a password reset.
type ConfirmResetTxParams struct {
	TokenID     [16]byte
	UserID      int64
	NewHash     string
	InvalidatAt time.Time
}

// PasswordResetRepository is the persistence contract for password reset operations.
type PasswordResetRepository interface {
	GetUserForPasswordReset(ctx context.Context, emailAddr string) (PasswordResetUserInfo, error)
	InvalidateUserPasswordResetTokens(ctx context.Context, userID int64) error
	InsertPasswordResetToken(ctx context.Context, userID int64, tokenHash string, expiresAt time.Time) error
	GetPasswordResetTokenByHash(ctx context.Context, tokenHash string) (PasswordResetTokenRow, error)
	ConfirmResetTransaction(ctx context.Context, p ConfirmResetTxParams) error
}
