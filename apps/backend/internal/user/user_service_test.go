/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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
func newNoopMailer() *internalmock.EmailEnqueuer {
	m := &internalmock.EmailEnqueuer{}
	m.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).Return(nil)
	return m
}

// Ensure the email import is exercised — EnqueueParams must be a known type.
var _ email.Enqueuer = (*internalmock.EmailEnqueuer)(nil)

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

		repo := &internalmock.UserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(makeUser("saqibtest", "saqib@example.com"), nil)
		svc := user.NewSvc(repo, newNoopMailer(), 4, "http://localhost:3000", []byte("test-secret"), log)

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
		repo := &internalmock.UserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(u, nil)
		svc := user.NewSvc(repo, newNoopMailer(), 4, "http://localhost:3000", []byte("test-secret"), log)

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

		repo := &internalmock.UserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(makeUser("saqibtest", "saqib@example.com"), nil).
			Run(func(args mock.Arguments) {
				p := args.Get(0).(user.CreateParams)
				assert.NotEqual(t, "SecurePass1", p.Hash, "plaintext password must not be stored")
				assert.NotEmpty(t, p.Hash)
			})
		svc := user.NewSvc(repo, newNoopMailer(), 4, "http://localhost:3000", []byte("test-secret"), log)

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
		repo := &internalmock.UserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(makeUser("saqibtest", "saqib@example.com"), nil).
			Run(func(args mock.Arguments) {
				p := args.Get(0).(user.CreateParams)
				assert.Equal(t, req.Username, p.Username)
				assert.Equal(t, req.Email, p.Email)
				require.NotNil(t, p.Name)
				assert.Equal(t, *req.Name, *p.Name)
			})
		svc := user.NewSvc(repo, newNoopMailer(), 4, "http://localhost:3000", []byte("test-secret"), log)

		_, err := svc.Register(context.Background(), req)

		require.NoError(t, err)
		repo.AssertExpectations(t)
	})

	t.Run("conflict error is propagated", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(models.User{}, user.ErrConflict)
		svc := user.NewSvc(repo, newNoopMailer(), 4, "http://localhost:3000", []byte("test-secret"), log)

		_, err := svc.Register(context.Background(), validReq)

		assert.ErrorIs(t, err, user.ErrConflict)
		repo.AssertExpectations(t)
	})

	t.Run("repository error is propagated", func(t *testing.T) {
		t.Parallel()

		repoErr := errors.New("db unavailable")
		repo := &internalmock.UserRepository{}
		repo.On("Create", mock.AnythingOfType("CreateParams")).Return(models.User{}, repoErr)
		svc := user.NewSvc(repo, newNoopMailer(), 4, "http://localhost:3000", []byte("test-secret"), log)

		_, err := svc.Register(context.Background(), validReq)

		assert.ErrorIs(t, err, repoErr)
		repo.AssertExpectations(t)
	})

	t.Run("bcrypt error is returned before repo is called", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		// cost > bcrypt.MaxCost (31) triggers InvalidCostError
		svc := user.NewSvc(repo, newNoopMailer(), 32, "http://localhost:3000", []byte("test-secret"), log)

		_, err := svc.Register(context.Background(), validReq)

		require.Error(t, err)
		repo.AssertNotCalled(t, "Create")
	})
}
