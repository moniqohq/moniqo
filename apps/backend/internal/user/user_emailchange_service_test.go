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
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

var testCurrentPassword = "CurrentPass1"

// testTokenSecret must match the secret newEmailChangeSvc passes to
// user.NewSvc, since testHashOTP replicates the unexported Svc.hashOTP so a
// test can build a live row with a code hash VerifyEmailChange will accept
// without going through the randomly generated code a real
// RequestEmailChange call would produce.
var testTokenSecret = []byte("test-secret")

// testHashOTP replicates Svc.hashOTP: peppered HMAC-SHA256 over
// requestID || code, keyed on testTokenSecret.
func testHashOTP(requestID uuid.UUID, code string) string {
	mac := hmac.New(sha256.New, testTokenSecret)
	mac.Write(requestID[:])
	mac.Write([]byte(code))
	return hex.EncodeToString(mac.Sum(nil))
}

func emailChangeUser() models.User {
	return models.User{
		ID:       1,
		Username: "saqibtest",
		Name:     ptr("Saqib"),
		Email:    "old@example.com",
		Status:   models.UserStatusActive,
	}
}

// newEmailChangeSvc wires a Svc with a 15-minute TTL and 30-minute lockout,
// matching the defaults SetEmailChangePolicy would otherwise apply.
func newEmailChangeSvc(repo user.Repository, mailer *internalmock.EmailEnqueuer) *user.Svc {
	svc := user.NewSvc(repo, mailer, bcrypt.MinCost, "http://localhost:3000", testTokenSecret, zap.NewNop())
	svc.SetEmailChangePolicy(15*time.Minute, 30*time.Minute)
	return svc
}

func TestUserService_RequestEmailChange(t *testing.T) {
	t.Parallel()

	hash, err := bcrypt.GenerateFromPassword([]byte(testCurrentPassword), bcrypt.MinCost)
	require.NoError(t, err)

	t.Run("success supersedes then inserts and mails both addresses", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetHashByID", int64(1)).Return(string(hash), nil)
		repo.On("EmailTaken", "new@example.com").Return(false, nil)

		var captured user.CreateEmailChangeParams
		repo.On("CreateEmailChange", mock.AnythingOfType("CreateEmailChangeParams")).
			Run(func(args mock.Arguments) {
				captured = args.Get(0).(user.CreateEmailChangeParams)
			}).
			Return(user.EmailChangeRequest{NewEmail: "new@example.com"}, nil)

		mailer := &internalmock.EmailEnqueuer{}
		var codeTo, requestedTo string
		mailer.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).
			Run(func(args mock.Arguments) {
				p := args.Get(0).(email.EnqueueParams)
				switch p.Template {
				case email.TemplateEmailChangeCode:
					codeTo = p.To
				case email.TemplateEmailChangeRequested:
					requestedTo = p.To
				}
			}).
			Return(nil).Times(2)

		svc := newEmailChangeSvc(repo, mailer)

		before := time.Now()
		status, err := svc.RequestEmailChange(context.Background(), 1, user.RequestEmailChangeRequest{
			NewEmail:        "new@example.com",
			CurrentPassword: &testCurrentPassword,
		})
		require.NoError(t, err)

		assert.True(t, status.Pending)
		assert.Equal(t, "new@example.com", status.NewEmail)
		assert.Equal(t, 3, status.AttemptsRemaining)
		require.NotNil(t, status.ExpiresAt)
		assert.WithinDuration(t, before.Add(15*time.Minute), *status.ExpiresAt, 5*time.Second)

		// The stored hash must never be the plaintext code, and must not be empty.
		assert.NotEmpty(t, captured.CodeHash)
		assert.Len(t, captured.CodeHash, 64) // hex-encoded SHA-256

		assert.Equal(t, "new@example.com", codeTo)
		assert.Equal(t, "old@example.com", requestedTo)

		repo.AssertExpectations(t)
		mailer.AssertExpectations(t)
	})

	t.Run("same email as current is rejected", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		_, err := svc.RequestEmailChange(context.Background(), 1, user.RequestEmailChangeRequest{
			NewEmail: "OLD@EXAMPLE.COM", // case-insensitive match
		})

		require.ErrorIs(t, err, user.ErrSameEmail)
		repo.AssertExpectations(t) // GetByID only — no lockout/hash/taken/create calls
	})

	t.Run("wrong password is rejected before any insert or mail", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetHashByID", int64(1)).Return(string(hash), nil)

		mailer := &internalmock.EmailEnqueuer{}
		svc := newEmailChangeSvc(repo, mailer)

		wrong := "WrongPassword1"
		_, err := svc.RequestEmailChange(context.Background(), 1, user.RequestEmailChangeRequest{
			NewEmail:        "new@example.com",
			CurrentPassword: &wrong,
		})

		require.ErrorIs(t, err, user.ErrWrongPassword)
		repo.AssertExpectations(t)
		repo.AssertNotCalled(t, "EmailTaken", mock.Anything)
		repo.AssertNotCalled(t, "CreateEmailChange", mock.Anything)
		mailer.AssertNotCalled(t, "Enqueue", mock.Anything)
	})

	t.Run("missing password is rejected when the account has one", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetHashByID", int64(1)).Return(string(hash), nil)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		_, err := svc.RequestEmailChange(context.Background(), 1, user.RequestEmailChangeRequest{
			NewEmail: "new@example.com",
		})

		require.ErrorIs(t, err, user.ErrWrongPassword)
	})

	t.Run("OIDC-only account skips the password gate", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetHashByID", int64(1)).Return("", nil) // no password credential
		repo.On("EmailTaken", "new@example.com").Return(false, nil)
		repo.On("CreateEmailChange", mock.AnythingOfType("CreateEmailChangeParams")).
			Return(user.EmailChangeRequest{NewEmail: "new@example.com"}, nil)

		mailer := &internalmock.EmailEnqueuer{}
		mailer.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).Return(nil).Times(2)

		svc := newEmailChangeSvc(repo, mailer)

		status, err := svc.RequestEmailChange(context.Background(), 1, user.RequestEmailChangeRequest{
			NewEmail: "new@example.com",
		})

		require.NoError(t, err)
		assert.True(t, status.Pending)
	})

	t.Run("email already taken is rejected before create", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetHashByID", int64(1)).Return(string(hash), nil)
		repo.On("EmailTaken", "new@example.com").Return(true, nil)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		_, err := svc.RequestEmailChange(context.Background(), 1, user.RequestEmailChangeRequest{
			NewEmail:        "new@example.com",
			CurrentPassword: &testCurrentPassword,
		})

		require.ErrorIs(t, err, user.ErrConflict)
		repo.AssertNotCalled(t, "CreateEmailChange", mock.Anything)
	})

	t.Run("inside cooldown is rejected before password check", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Now().Add(-time.Minute), true, nil)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		_, err := svc.RequestEmailChange(context.Background(), 1, user.RequestEmailChangeRequest{
			NewEmail: "new@example.com",
		})

		var lockedErr *user.LockedError
		require.ErrorAs(t, err, &lockedErr)
		assert.InDelta(t, 29*time.Minute, lockedErr.RetryAfter, float64(5*time.Second))
		repo.AssertNotCalled(t, "GetHashByID", mock.Anything)
	})

	t.Run("mailer failure does not fail the request", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetHashByID", int64(1)).Return(string(hash), nil)
		repo.On("EmailTaken", "new@example.com").Return(false, nil)
		repo.On("CreateEmailChange", mock.AnythingOfType("CreateEmailChangeParams")).
			Return(user.EmailChangeRequest{NewEmail: "new@example.com"}, nil)

		mailer := &internalmock.EmailEnqueuer{}
		mailer.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).Return(errors.New("smtp down")).Times(2)

		svc := newEmailChangeSvc(repo, mailer)

		status, err := svc.RequestEmailChange(context.Background(), 1, user.RequestEmailChangeRequest{
			NewEmail:        "new@example.com",
			CurrentPassword: &testCurrentPassword,
		})

		require.NoError(t, err)
		assert.True(t, status.Pending)
	})
}

func TestUserService_VerifyEmailChange(t *testing.T) {
	t.Parallel()

	t.Run("correct code applies the change and mails the old address", func(t *testing.T) {
		t.Parallel()

		requestID := uuid.New()
		code := "483920"
		live := user.EmailChangeRequest{
			ID:        requestID,
			UserID:    1,
			NewEmail:  "new@example.com",
			CodeHash:  testHashOTP(requestID, code),
			ExpiresAt: time.Now().Add(15 * time.Minute),
		}

		repo := &internalmock.UserRepository{}
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetLiveEmailChange", int64(1)).Return(live, nil)
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("CompleteEmailChange", requestID, int64(1), "new@example.com").
			Return(models.User{ID: 1, Email: "new@example.com"}, nil)

		var completedTo string
		mailer := &internalmock.EmailEnqueuer{}
		mailer.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).
			Run(func(args mock.Arguments) {
				p := args.Get(0).(email.EnqueueParams)
				if p.Template == email.TemplateEmailChangeCompleted {
					completedTo = p.To
				}
			}).
			Return(nil)

		svc := newEmailChangeSvc(repo, mailer)

		updated, err := svc.VerifyEmailChange(context.Background(), 1, user.VerifyEmailChangeRequest{Code: code})

		require.NoError(t, err)
		assert.Equal(t, "new@example.com", updated.Email)
		assert.Equal(t, "old@example.com", completedTo) // notice goes to the address being replaced, not the new one
		repo.AssertExpectations(t)
	})

	t.Run("wrong code decrements attempts remaining", func(t *testing.T) {
		t.Parallel()

		requestID := uuid.New()
		live := user.EmailChangeRequest{
			ID:        requestID,
			UserID:    1,
			NewEmail:  "new@example.com",
			CodeHash:  "does-not-match",
			ExpiresAt: time.Now().Add(15 * time.Minute),
		}

		repo := &internalmock.UserRepository{}
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetLiveEmailChange", int64(1)).Return(live, nil)
		repo.On("IncrementEmailChangeAttempt", requestID).Return(int32(1), nil)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		_, err := svc.VerifyEmailChange(context.Background(), 1, user.VerifyEmailChangeRequest{Code: "000000"})

		var invalidErr *user.InvalidCodeError
		require.ErrorAs(t, err, &invalidErr)
		assert.Equal(t, 2, invalidErr.AttemptsRemaining)
	})

	t.Run("third wrong code locks out and starts the cooldown", func(t *testing.T) {
		t.Parallel()

		requestID := uuid.New()
		live := user.EmailChangeRequest{
			ID:        requestID,
			UserID:    1,
			NewEmail:  "new@example.com",
			CodeHash:  "does-not-match",
			ExpiresAt: time.Now().Add(15 * time.Minute),
		}

		repo := &internalmock.UserRepository{}
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetLiveEmailChange", int64(1)).Return(live, nil)
		repo.On("IncrementEmailChangeAttempt", requestID).Return(int32(3), nil)
		repo.On("FailEmailChange", requestID).Return(nil)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		_, err := svc.VerifyEmailChange(context.Background(), 1, user.VerifyEmailChangeRequest{Code: "000000"})

		var lockedErr *user.LockedError
		require.ErrorAs(t, err, &lockedErr)
		assert.Equal(t, 30*time.Minute, lockedErr.RetryAfter)
		repo.AssertExpectations(t)
	})

	t.Run("expired code is rejected like a wrong one and marks failed", func(t *testing.T) {
		t.Parallel()

		requestID := uuid.New()
		live := user.EmailChangeRequest{
			ID:        requestID,
			UserID:    1,
			NewEmail:  "new@example.com",
			CodeHash:  "irrelevant",
			ExpiresAt: time.Now().Add(-time.Minute), // already expired
		}

		repo := &internalmock.UserRepository{}
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetLiveEmailChange", int64(1)).Return(live, nil)
		repo.On("FailEmailChange", requestID).Return(nil)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		_, err := svc.VerifyEmailChange(context.Background(), 1, user.VerifyEmailChangeRequest{Code: "000000"})

		var invalidErr *user.InvalidCodeError
		require.ErrorAs(t, err, &invalidErr)
		assert.Equal(t, 0, invalidErr.AttemptsRemaining)
	})

	t.Run("no live request returns ErrNoPendingEmailChange", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetLiveEmailChange", int64(1)).Return(user.EmailChangeRequest{}, user.ErrNoPendingEmailChange)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		_, err := svc.VerifyEmailChange(context.Background(), 1, user.VerifyEmailChangeRequest{Code: "000000"})

		require.ErrorIs(t, err, user.ErrNoPendingEmailChange)
	})

	t.Run("conflict on complete cancels the request", func(t *testing.T) {
		t.Parallel()

		requestID := uuid.New()
		code := "483920"
		live := user.EmailChangeRequest{
			ID:        requestID,
			UserID:    1,
			NewEmail:  "new@example.com",
			CodeHash:  testHashOTP(requestID, code),
			ExpiresAt: time.Now().Add(15 * time.Minute),
		}

		repo := &internalmock.UserRepository{}
		repo.On("GetEmailChangeLockout", int64(1)).Return(time.Time{}, false, nil)
		repo.On("GetLiveEmailChange", int64(1)).Return(live, nil)
		repo.On("GetByID", int64(1)).Return(emailChangeUser(), nil)
		repo.On("CompleteEmailChange", requestID, int64(1), "new@example.com").
			Return(models.User{}, user.ErrConflict)
		repo.On("CancelEmailChanges", int64(1)).Return(nil)

		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})
		_, err := svc.VerifyEmailChange(context.Background(), 1, user.VerifyEmailChangeRequest{Code: code})

		require.ErrorIs(t, err, user.ErrConflict)
		repo.AssertExpectations(t)
	})
}

func TestUserService_CancelEmailChange(t *testing.T) {
	t.Parallel()

	repo := &internalmock.UserRepository{}
	repo.On("CancelEmailChanges", int64(1)).Return(nil)
	svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

	err := svc.CancelEmailChange(context.Background(), 1)

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestUserService_GetEmailChangeStatus(t *testing.T) {
	t.Parallel()

	t.Run("pending", func(t *testing.T) {
		t.Parallel()

		requestID := uuid.New()
		expiresAt := time.Now().Add(10 * time.Minute)
		repo := &internalmock.UserRepository{}
		repo.On("GetLiveEmailChange", int64(1)).Return(user.EmailChangeRequest{
			ID: requestID, UserID: 1, NewEmail: "new@example.com", AttemptCount: 1, ExpiresAt: expiresAt,
		}, nil)
		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		status, err := svc.GetEmailChangeStatus(context.Background(), 1)

		require.NoError(t, err)
		assert.True(t, status.Pending)
		assert.Equal(t, "new@example.com", status.NewEmail)
		assert.Equal(t, 2, status.AttemptsRemaining)
	})

	t.Run("nothing pending", func(t *testing.T) {
		t.Parallel()

		repo := &internalmock.UserRepository{}
		repo.On("GetLiveEmailChange", int64(1)).Return(user.EmailChangeRequest{}, user.ErrNoPendingEmailChange)
		svc := newEmailChangeSvc(repo, &internalmock.EmailEnqueuer{})

		status, err := svc.GetEmailChangeStatus(context.Background(), 1)

		require.NoError(t, err)
		assert.False(t, status.Pending)
	})
}
