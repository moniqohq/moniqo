package auth

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// AuthRepository is the persistence contract for authentication operations.
type AuthRepository interface {
	GetUserByEmail(ctx context.Context, email string) (UserCredentials, error)
	UpdateLastLogin(ctx context.Context, userID int64) error
	InsertRevokedAccessToken(ctx context.Context, p InsertRevokedTokenParams) error
	IsAccessTokenRevoked(ctx context.Context, jti pgtype.UUID) (bool, error)
	UserExistsByID(ctx context.Context, userID int64) (bool, error)
}

// AuthSvc implements authentication business logic.
type AuthSvc struct {
	repo           AuthRepository
	jwtSecret      []byte
	accessTokenTTL time.Duration
	log            *zap.Logger
}

func NewAuthSvc(repo AuthRepository, jwtSecret []byte, accessTokenTTL time.Duration, log *zap.Logger) *AuthSvc {
	return &AuthSvc{
		repo:           repo,
		jwtSecret:      jwtSecret,
		accessTokenTTL: accessTokenTTL,
		log:            log,
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

	if err := s.repo.UpdateLastLogin(ctx, creds.User.ID); err != nil {
		s.log.Error("login: failed to update last_login", zap.Int64("user_id", creds.User.ID), zap.Error(err))
		return LoginResult{}, err
	}

	s.log.Info("login successful", zap.Int64("user_id", creds.User.ID))
	return LoginResult{AccessToken: tokenString, TokenType: "Bearer"}, nil
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
