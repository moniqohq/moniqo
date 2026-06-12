package user

import (
	"context"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// UserRepository is the persistence contract required by UserSvc.
type UserRepository interface {
	Create(ctx context.Context, p CreateParams) (models.User, error)
}

// UserSvc implements the business logic for user operations.
type UserSvc struct {
	repo       UserRepository
	bcryptCost int
	log        *zap.Logger
}

func NewUserSvc(repo UserRepository, bcryptCost int, log *zap.Logger) *UserSvc {
	return &UserSvc{repo: repo, bcryptCost: bcryptCost, log: log}
}

// Register hashes the password and persists the new user, returning a
// public-safe representation on success.
func (s *UserSvc) Register(ctx context.Context, req RegisterRequest) (models.User, error) {
	s.log.Info("registering new user", zap.String("username", req.Username), zap.String("email", req.Email))

	s.log.Debug("hashing password", zap.String("username", req.Username), zap.Int("bcrypt_cost", s.bcryptCost))
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), s.bcryptCost)
	if err != nil {
		s.log.Error("failed to hash password", zap.String("username", req.Username), zap.Error(err))
		return models.User{}, err
	}

	s.log.Debug("persisting user via repo", zap.String("username", req.Username))
	pub, err := s.repo.Create(ctx, CreateParams{
		Username: req.Username,
		Email:    req.Email,
		Hash:     string(hash),
		Name:     req.Name,
	})
	if err != nil {
		if err == ErrConflict {
			s.log.Debug("registration rejected: username or email already taken", zap.String("username", req.Username), zap.String("email", req.Email))
		} else {
			s.log.Error("failed to persist user", zap.String("username", req.Username), zap.Error(err))
		}
		return models.User{}, err
	}

	s.log.Info("user registered successfully", zap.Int64("user_id", pub.ID), zap.String("username", pub.Username))
	return pub, nil
}
