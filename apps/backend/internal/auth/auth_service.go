package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// AuthRepository is the persistence contract for authentication operations.
type AuthRepository interface {
	GetUserByEmail(ctx context.Context, email string) (UserCredentials, error)
	UpdateLastLogin(ctx context.Context, userID int64) error
	InsertRevokedAccessToken(ctx context.Context, p InsertRevokedTokenParams) error
	IsAccessTokenRevoked(ctx context.Context, jti pgtype.UUID) (bool, error)
	UserExistsByID(ctx context.Context, userID int64) (bool, error)

	InsertRefreshToken(ctx context.Context, p InsertRefreshTokenRepoParams) ([16]byte, error)
	GetRefreshTokenByHash(ctx context.Context, hash string) (db.RefreshToken, error)
	MarkRefreshTokenUsed(ctx context.Context, id [16]byte) error
	RevokeRefreshTokenFamily(ctx context.Context, familyID [16]byte, reason string) error
	RotateRefreshToken(ctx context.Context, oldID [16]byte, p InsertRefreshTokenRepoParams) ([16]byte, error)
}

// AuthSvc implements authentication business logic.
type AuthSvc struct {
	repo               AuthRepository
	jwtSecret          []byte
	accessTokenTTL     time.Duration
	refreshTokenTTL    time.Duration
	refreshTokenMaxAge time.Duration
	log                *zap.Logger
}

func NewAuthSvc(
	repo AuthRepository,
	jwtSecret []byte,
	accessTokenTTL time.Duration,
	refreshTokenTTL time.Duration,
	refreshTokenMaxAge time.Duration,
	log *zap.Logger,
) *AuthSvc {
	return &AuthSvc{
		repo:               repo,
		jwtSecret:          jwtSecret,
		accessTokenTTL:     accessTokenTTL,
		refreshTokenTTL:    refreshTokenTTL,
		refreshTokenMaxAge: refreshTokenMaxAge,
		log:                log,
	}
}

// Login verifies credentials, enforces account status, issues an access token,
// and updates last_login on success.
func (s *AuthSvc) Login(ctx context.Context, req LoginRequest) (LoginResult, error) {
	s.log.Info("processing login", zap.String("email", req.Email))

	creds, err := s.repo.GetUserByEmail(ctx, req.Email)
	if errors.Is(err, ErrUserNotFound) {
		s.log.Debug("login rejected: user not found", zap.String("email", req.Email))
		return LoginResult{}, ErrInvalidCredentials
	}
	if err != nil {
		s.log.Error("login: repo error on GetUserByEmail", zap.String("email", req.Email), zap.Error(err))
		return LoginResult{}, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(creds.Hash), []byte(req.Password)); err != nil {
		s.log.Debug("login rejected: password mismatch", zap.String("email", req.Email))
		return LoginResult{}, ErrInvalidCredentials
	}

	if creds.User.Status == models.UserStatusPendingVerification {
		s.log.Debug("login rejected: account pending verification", zap.String("email", req.Email))
		return LoginResult{}, ErrPendingVerification
	}

	tokenString, _, err := GenerateAccessToken(creds.User.ID, s.jwtSecret, s.accessTokenTTL)
	if err != nil {
		s.log.Error("login: JWT generation failed", zap.String("email", req.Email), zap.Error(err))
		return LoginResult{}, err
	}

	refreshIssue, err := s.IssueRefreshToken(ctx, creds.User.ID)
	if err != nil {
		s.log.Error("login: refresh token issuance failed", zap.String("email", req.Email), zap.Error(err))
		return LoginResult{}, err
	}

	if err := s.repo.UpdateLastLogin(ctx, creds.User.ID); err != nil {
		s.log.Error("login: failed to update last_login", zap.Int64("user_id", creds.User.ID), zap.Error(err))
		return LoginResult{}, err
	}

	s.log.Info("login successful", zap.Int64("user_id", creds.User.ID))
	return LoginResult{
		AccessToken:  tokenString,
		TokenType:    "Bearer",
		RefreshToken: refreshIssue.RawToken,
	}, nil
}

// IssueRefreshToken creates a new token family and inserts the first refresh
// token row. Returns the raw token (sent to the client) and its expiry.
func (s *AuthSvc) IssueRefreshToken(ctx context.Context, userID int64) (RefreshIssue, error) {
	raw, hash, err := GenerateRefreshToken()
	if err != nil {
		return RefreshIssue{}, err
	}

	familyID := uuid.New()
	now := time.Now()
	expiresAt := now.Add(s.refreshTokenTTL)
	absoluteExpiresAt := now.Add(s.refreshTokenMaxAge)

	if _, err := s.repo.InsertRefreshToken(ctx, InsertRefreshTokenRepoParams{
		FamilyID:          familyID,
		UserID:            userID,
		TokenHash:         hash,
		ExpiresAt:         expiresAt,
		AbsoluteExpiresAt: absoluteExpiresAt,
	}); err != nil {
		return RefreshIssue{}, err
	}

	return RefreshIssue{RawToken: raw, ExpiresAt: expiresAt}, nil
}

// RefreshAccessToken validates rawToken, detects reuse, rotates the token, and
// mints a new access token. Returns ErrRefreshTokenInvalid for all invalid/
// rejected states so the handler never leaks the specific failure reason.
func (s *AuthSvc) RefreshAccessToken(ctx context.Context, rawToken string) (RefreshResult, error) {
	hash := HashRefreshToken(rawToken)

	row, err := s.repo.GetRefreshTokenByHash(ctx, hash)
	if errors.Is(err, ErrRefreshTokenInvalid) {
		return RefreshResult{}, ErrRefreshTokenInvalid
	}
	if err != nil {
		return RefreshResult{}, err
	}

	now := time.Now()

	// Reject if revoked.
	if row.RevokedAt.Valid {
		return RefreshResult{}, ErrRefreshTokenInvalid
	}

	// Reuse detection: token already consumed → revoke entire family.
	if row.UsedAt.Valid {
		s.log.Warn("refresh token reuse detected — revoking family",
			zap.String("family_id", row.FamilyID.String()))
		reason := "reuse_detected"
		_ = s.repo.RevokeRefreshTokenFamily(ctx, row.FamilyID.Bytes, reason)
		return RefreshResult{}, ErrRefreshTokenInvalid
	}

	// Reject if expired.
	if row.ExpiresAt.Valid && now.After(row.ExpiresAt.Time) {
		return RefreshResult{}, ErrRefreshTokenInvalid
	}

	// Reject if absolute session cap exceeded.
	if row.AbsoluteExpiresAt.Valid && now.After(row.AbsoluteExpiresAt.Time) {
		return RefreshResult{}, ErrRefreshTokenInvalid
	}

	// Mint new tokens.
	newRaw, newHash, err := GenerateRefreshToken()
	if err != nil {
		return RefreshResult{}, err
	}

	// Clamp new expiry to the inherited absolute cap.
	newExpiresAt := now.Add(s.refreshTokenTTL)
	if row.AbsoluteExpiresAt.Valid && newExpiresAt.After(row.AbsoluteExpiresAt.Time) {
		newExpiresAt = row.AbsoluteExpiresAt.Time
	}

	if _, err := s.repo.RotateRefreshToken(ctx, row.ID.Bytes, InsertRefreshTokenRepoParams{
		FamilyID:          row.FamilyID.Bytes,
		UserID:            row.UserID,
		TokenHash:         newHash,
		ExpiresAt:         newExpiresAt,
		AbsoluteExpiresAt: row.AbsoluteExpiresAt.Time,
	}); err != nil {
		return RefreshResult{}, err
	}

	userID := row.UserID
	accessToken, _, err := GenerateAccessToken(userID, s.jwtSecret, s.accessTokenTTL)
	if err != nil {
		return RefreshResult{}, err
	}

	return RefreshResult{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		Refresh:     RefreshIssue{RawToken: newRaw, ExpiresAt: newExpiresAt},
	}, nil
}

// Logout inserts the access token's jti into the revocation blocklist so that
// subsequent requests carrying it are rejected by the auth middleware.
func (s *AuthSvc) Logout(ctx context.Context, params LogoutParams) error {
	s.log.Info("processing logout", zap.Int64("user_id", params.UserID))

	jtiPg := pgtype.UUID{Bytes: params.JTI, Valid: true}
	if err := s.repo.InsertRevokedAccessToken(ctx, InsertRevokedTokenParams{
		JTI:       jtiPg,
		UserID:    params.UserID,
		ExpiresAt: params.ExpiresAt,
	}); err != nil {
		s.log.Error("logout: failed to revoke access token", zap.Int64("user_id", params.UserID), zap.Error(err))
		return err
	}

	s.log.Info("logout successful", zap.Int64("user_id", params.UserID))
	return nil
}
