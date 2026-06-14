package user

import (
	"context"
	"fmt"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
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
	mailer     email.Enqueuer
	bcryptCost int
	appBaseURL string
	log        *zap.Logger
}

func NewUserSvc(repo UserRepository, mailer email.Enqueuer, bcryptCost int, appBaseURL string, log *zap.Logger) *UserSvc {
	return &UserSvc{repo: repo, mailer: mailer, bcryptCost: bcryptCost, appBaseURL: appBaseURL, log: log}
}

// Register hashes the password, persists the new user, and enqueues a
// verification email.  The 201 response is returned before the email is sent;
// failures to enqueue are logged but do not fail registration.
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
	s.enqueueVerification(ctx, pub)
	return pub, nil
}

func (s *UserSvc) enqueueVerification(ctx context.Context, u models.User) {
	name := ""
	if u.Name != nil {
		name = *u.Name
	}
	verURL := fmt.Sprintf("%s/verify?token=PLACEHOLDER_%d", s.appBaseURL, u.ID)

	err := s.mailer.Enqueue(ctx, email.EnqueueParams{
		IdempotencyKey: fmt.Sprintf("verification:%d", u.ID),
		Template:       email.TemplateVerification,
		To:             u.Email,
		ToName:         name,
		Payload: map[string]any{
			"Name":            name,
			"VerificationURL": verURL,
			"ExpiresIn":       "24 hours",
		},
	})
	if err != nil {
		s.log.Error("failed to enqueue verification email",
			zap.Int64("user_id", u.ID),
			zap.Error(err),
		)
	}
}
