package user

import (
	"context"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// RegisterRequest is the input to Service.Register.
type RegisterRequest struct {
	Username string
	Password string
	Email    string
	Name     *string
}

// Service implements the business logic for user operations.
type Service struct {
	repo       *UserRepo
	bcryptCost int
	log        *zap.Logger
}

func NewService(repo *UserRepo, bcryptCost int, log *zap.Logger) *Service {
	return &Service{repo: repo, bcryptCost: bcryptCost, log: log}
}

// Register hashes the password and persists the new user, returning a
// public-safe representation on success.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (models.User, error) {
	s.log.Info("registering new user", zap.String("username", req.Username), zap.String("email", req.Email))

	s.log.Debug("hashing password", zap.String("username", req.Username), zap.Int("bcrypt_cost", s.bcryptCost))
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), s.bcryptCost)
	if err != nil {
		s.log.Error("failed to hash password", zap.String("username", req.Username), zap.Error(err))
		return models.User{}, err
	}

	s.log.Debug("persisting user via repo", zap.String("username", req.Username))
	row, err := s.repo.Create(ctx, createParams{
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

	s.log.Info("user registered successfully", zap.Int64("user_id", row.ID), zap.String("username", row.Username))
	return rowToPublic(row), nil
}

func rowToPublic(row db.CreateUserRow) models.User {
	pub := models.User{
		ID:        row.ID,
		Name:      row.Name,
		Username:  row.Username,
		Email:     row.Email,
		Picture:   row.Picture,
		Status:    models.UserStatus(row.Status),
		LastLogin: nil, // always null on creation
		CreatedAt: row.CreatedAt.Time,
	}
	return pub
}
