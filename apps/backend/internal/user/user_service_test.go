package user_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

func ptr[T any](v T) *T { return &v }

// newNoopMailer returns a mock enqueuer that accepts any Enqueue call.
// Tests focused on user registration logic use this to avoid caring about email side-effects.
func newNoopMailer() *internalmock.MockEmailEnqueuer {
	m := &internalmock.MockEmailEnqueuer{}
	m.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).Return(nil)
	return m
}

// Ensure the email import is exercised — EnqueueParams must be a known type.
var _ email.Enqueuer = (*internalmock.MockEmailEnqueuer)(nil)

func makeUser(username, email string) models.User {
	return models.User{
		ID:       1,
		Username: username,
		Email:    email,
		Status:   models.UserStatusPendingVerification,
	}
}

func TestUserService_Register(t *testing.T) {
	t.Parallel()

	log := zap.NewNop()
	validReq := user.RegisterRequest{
		Username: "saqibtest",
		Password: "SecurePass1",
		Email:    "saqib@example.com",
	}

	t.Run("success", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockUserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(makeUser("saqibtest", "saqib@example.com"), nil)
		svc := user.NewUserSvc(repo, newNoopMailer(), 4, "http://localhost:3000", log)

		pub, err := svc.Register(context.Background(), validReq)

		require.NoError(t, err)
		assert.Equal(t, "saqibtest", pub.Username)
		assert.Equal(t, "saqib@example.com", pub.Email)
		assert.Equal(t, models.UserStatusPendingVerification, pub.Status)
		assert.Nil(t, pub.LastLogin)
		repo.AssertExpectations(t)
	})

	t.Run("success with name", func(t *testing.T) {
		t.Parallel()

		u := makeUser("saqibtest", "saqib@example.com")
		u.Name = ptr("Saqib")
		repo := &internalmock.MockUserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(u, nil)
		svc := user.NewUserSvc(repo, newNoopMailer(), 4, "http://localhost:3000", log)

		req := validReq
		req.Name = ptr("Saqib")
		pub, err := svc.Register(context.Background(), req)

		require.NoError(t, err)
		require.NotNil(t, pub.Name)
		assert.Equal(t, "Saqib", *pub.Name)
		repo.AssertExpectations(t)
	})

	t.Run("password is hashed before storage", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockUserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(makeUser("saqibtest", "saqib@example.com"), nil).
			Run(func(args mock.Arguments) {
				p := args.Get(0).(user.CreateParams)
				assert.NotEqual(t, "SecurePass1", p.Hash, "plaintext password must not be stored")
				assert.NotEmpty(t, p.Hash)
			})
		svc := user.NewUserSvc(repo, newNoopMailer(), 4, "http://localhost:3000", log)

		_, err := svc.Register(context.Background(), validReq)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("correct fields forwarded to repo", func(t *testing.T) {
		t.Parallel()

		req := user.RegisterRequest{
			Username: "saqibtest",
			Password: "SecurePass1",
			Email:    "saqib@example.com",
			Name:     ptr("Saqib"),
		}
		repo := &internalmock.MockUserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(makeUser("saqibtest", "saqib@example.com"), nil).
			Run(func(args mock.Arguments) {
				p := args.Get(0).(user.CreateParams)
				assert.Equal(t, req.Username, p.Username)
				assert.Equal(t, req.Email, p.Email)
				require.NotNil(t, p.Name)
				assert.Equal(t, *req.Name, *p.Name)
			})
		svc := user.NewUserSvc(repo, newNoopMailer(), 4, "http://localhost:3000", log)

		_, err := svc.Register(context.Background(), req)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("conflict error is propagated", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockUserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(models.User{}, user.ErrConflict)
		svc := user.NewUserSvc(repo, newNoopMailer(), 4, "http://localhost:3000", log)

		_, err := svc.Register(context.Background(), validReq)

		assert.ErrorIs(t, err, user.ErrConflict)
		repo.AssertExpectations(t)
	})

	t.Run("repository error is propagated", func(t *testing.T) {
		t.Parallel()

		repoErr := errors.New("db unavailable")
		repo := &internalmock.MockUserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(models.User{}, repoErr)
		svc := user.NewUserSvc(repo, newNoopMailer(), 4, "http://localhost:3000", log)

		_, err := svc.Register(context.Background(), validReq)

		assert.ErrorIs(t, err, repoErr)
		repo.AssertExpectations(t)
	})

	t.Run("bcrypt error is returned before repo is called", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.MockUserRepository{}
		// cost > bcrypt.MaxCost (31) triggers InvalidCostError
		svc := user.NewUserSvc(repo, newNoopMailer(), 32, "http://localhost:3000", log)

		_, err := svc.Register(context.Background(), validReq)

		require.Error(t, err)
		repo.AssertNotCalled(t, "Create")
	})
}
