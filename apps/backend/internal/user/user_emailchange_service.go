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

package user

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

const (
	// emailChangeMaxAttempts is a security invariant, not a tunable — unlike
	// the TTL and lockout duration, it is deliberately not exposed via
	// SetEmailChangePolicy.
	emailChangeMaxAttempts = 3

	otpDigits     = 6
	otpUpperBound = 1_000_000 // 10^otpDigits

	// emailChangeSupportEmail is surfaced in the old-address notices so a
	// recipient who didn't request the change has somewhere to report it.
	emailChangeSupportEmail = "support@moniqo.in"

	// Email template payload keys, shared across the three email-change
	// notices below and (payloadKeyName, payloadKeyExpiresIn) with
	// enqueueVerification in user_service.go — factored out because each
	// literal recurs enough times in this package to trip goconst otherwise.
	payloadKeyName         = "Name"
	payloadKeyNewEmail     = "NewEmail"
	payloadKeyExpiresIn    = "ExpiresIn"
	payloadKeyCode         = "Code"
	payloadKeyMaxAttempts  = "MaxAttempts"
	payloadKeySupportEmail = "SupportEmail"
)

// newOTPCode returns a uniformly random, zero-padded 6-digit code using
// crypto/rand — never math/rand, and never a naive modulo (which would bias
// toward smaller codes for a non-power-of-two upper bound; rand.Int already
// avoids that).
func newOTPCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(otpUpperBound))
	if err != nil {
		return "", fmt.Errorf("generate otp: %w", err)
	}
	return fmt.Sprintf("%0*d", otpDigits, n.Int64()), nil
}

// hashOTP returns the peppered HMAC-SHA256 hex digest of code, bound to
// requestID so the same code minted for two different requests never
// produces the same hash and a leaked hash cannot be replayed against a
// different request.
//
// A bare SHA-256 (as auth.HashRefreshToken uses for 64-hex-char reset
// tokens) is the wrong tool here: a 6-digit code is only a 10^6 keyspace, a
// few milliseconds of CPU to brute-force offline, so a database leak would
// hand over every live OTP. bcrypt would close that gap but at ~250ms per
// verify attempt — real cost on an endpoint whose whole job is to be hit by
// an attacker. HMAC with a pepper that never leaves the server (s.tokenSecret,
// the same key that signs email-verification tokens) makes offline brute
// force impossible without also compromising the app secret, at negligible
// cost; online guessing is separately capped by the 3-attempt limit, the
// 15-minute TTL, the post-lockout cooldown, and the IP rate limiter.
func (s *Svc) hashOTP(requestID uuid.UUID, code string) string {
	mac := hmac.New(sha256.New, s.tokenSecret)
	_, _ = mac.Write(requestID[:])
	_, _ = mac.Write([]byte(code))
	return hex.EncodeToString(mac.Sum(nil))
}

// RequestEmailChange validates the request, re-authenticates the caller (if
// the account has a password credential), and — if the new address is free
// and the user isn't in a post-lockout cooldown — supersedes any pending
// request and issues a fresh 15-minute OTP to the new address. A "requested"
// notice is also sent to the current address, best-effort, so an account
// owner who didn't initiate this finds out even if they never see the new
// inbox.
//
//nolint:revive // the validate-then-issue steps are sequential and read more clearly inline than split up
func (s *Svc) RequestEmailChange(ctx context.Context, id int64, req RequestEmailChangeRequest) (EmailChangeStatus, error) {
	s.log.Info("requesting email change", zap.Int64("user_id", id))

	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return EmailChangeStatus{}, fmt.Errorf("get user by id: %w", err)
	}

	if strings.EqualFold(req.NewEmail, current.Email) {
		return EmailChangeStatus{}, ErrSameEmail
	}

	if err := s.checkEmailChangeLockout(ctx, id); err != nil {
		return EmailChangeStatus{}, err
	}

	if err := s.reauthenticate(ctx, id, req.CurrentPassword); err != nil {
		return EmailChangeStatus{}, err
	}

	taken, err := s.repo.EmailTaken(ctx, req.NewEmail)
	if err != nil {
		return EmailChangeStatus{}, fmt.Errorf("check email taken: %w", err)
	}
	if taken {
		return EmailChangeStatus{}, ErrConflict
	}

	requestID := uuid.New()
	code, err := newOTPCode()
	if err != nil {
		return EmailChangeStatus{}, err
	}
	expiresAt := time.Now().Add(s.emailChangeTTL)

	created, err := s.repo.CreateEmailChange(ctx, CreateEmailChangeParams{
		ID:        requestID,
		UserID:    id,
		NewEmail:  req.NewEmail,
		CodeHash:  s.hashOTP(requestID, code),
		ExpiresAt: expiresAt,
	})
	if err != nil {
		return EmailChangeStatus{}, fmt.Errorf("create email change: %w", err)
	}

	s.enqueueEmailChangeCode(ctx, requestID, current, req.NewEmail, code)
	s.enqueueEmailChangeRequested(ctx, requestID, current, req.NewEmail)

	return EmailChangeStatus{
		Pending:           true,
		NewEmail:          created.NewEmail,
		ExpiresAt:         &expiresAt,
		AttemptsRemaining: emailChangeMaxAttempts,
	}, nil
}

// reauthenticate requires and checks the current password, unless the
// account has none (an OIDC-only signup, users.hash IS NULL) — there is
// nothing to verify for those, so the check is skipped and the OTP plus the
// old-address notification are the control.
func (s *Svc) reauthenticate(ctx context.Context, id int64, currentPassword *string) error {
	hash, err := s.repo.GetHashByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get hash by id: %w", err)
	}
	if hash == "" {
		return nil
	}
	if currentPassword == nil {
		return ErrWrongPassword
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(*currentPassword)); err != nil {
		return ErrWrongPassword
	}
	return nil
}

// checkEmailChangeLockout returns *LockedError if the user is still inside
// the post-lockout cooldown from a prior request's third wrong code.
func (s *Svc) checkEmailChangeLockout(ctx context.Context, id int64) error {
	failedAt, ok, err := s.repo.GetEmailChangeLockout(ctx, id)
	if err != nil {
		return fmt.Errorf("get email change lockout: %w", err)
	}
	if !ok {
		return nil
	}
	retryAt := failedAt.Add(s.emailChangeLockout)
	if remaining := time.Until(retryAt); remaining > 0 {
		return &LockedError{RetryAfter: remaining}
	}
	return nil
}

// VerifyEmailChange checks code against the user's live email change
// request. On the third wrong (or expired) code, the request is invalidated
// and a cooldown begins. On a correct code, the change is applied
// atomically and a "completed" notice is sent to the address being replaced.
func (s *Svc) VerifyEmailChange(ctx context.Context, id int64, req VerifyEmailChangeRequest) (models.User, error) {
	s.log.Info("verifying email change", zap.Int64("user_id", id))

	if err := s.checkEmailChangeLockout(ctx, id); err != nil {
		return models.User{}, err
	}

	live, err := s.repo.GetLiveEmailChange(ctx, id)
	if err != nil {
		return models.User{}, fmt.Errorf("get live email change: %w", err)
	}

	if time.Now().After(live.ExpiresAt) {
		return models.User{}, s.expireEmailChange(ctx, id, live.ID)
	}

	want := []byte(s.hashOTP(live.ID, req.Code))
	got := []byte(live.CodeHash)
	if !hmac.Equal(want, got) {
		return models.User{}, s.recordWrongEmailChangeAttempt(ctx, id, live.ID)
	}

	return s.completeEmailChange(ctx, id, live)
}

// expireEmailChange marks an expired request failed (starting the cooldown,
// same as a third wrong code) and reports it identically to a wrong code —
// the client cannot distinguish "you were too slow" from "you guessed wrong".
func (s *Svc) expireEmailChange(ctx context.Context, userID int64, requestID uuid.UUID) error {
	if err := s.repo.FailEmailChange(ctx, requestID); err != nil {
		s.log.Error("failed to mark expired email change as failed", zap.Int64("user_id", userID), zap.Error(err))
	}
	return &InvalidCodeError{AttemptsRemaining: 0}
}

// completeEmailChange applies a verified code: it looks up the profile
// being replaced (for the "completed" notice's recipient), commits the
// change, and — if the address was claimed by someone else during the
// verification window — best-effort cancels the now-dead request.
func (s *Svc) completeEmailChange(ctx context.Context, userID int64, live EmailChangeRequest) (models.User, error) {
	current, err := s.repo.GetByID(ctx, userID)
	if err != nil {
		return models.User{}, fmt.Errorf("get user by id: %w", err)
	}

	updated, err := s.repo.CompleteEmailChange(ctx, live.ID, userID, live.NewEmail)
	if err != nil {
		if errors.Is(err, ErrConflict) {
			if cancelErr := s.repo.CancelEmailChanges(ctx, userID); cancelErr != nil {
				s.log.Error("failed to cancel email change after conflict", zap.Int64("user_id", userID), zap.Error(cancelErr))
			}
		}
		return models.User{}, fmt.Errorf("complete email change: %w", err)
	}

	s.enqueueEmailChangeCompleted(ctx, live.ID, current, live.NewEmail)
	return updated, nil
}

// recordWrongEmailChangeAttempt increments the attempt counter for a wrong
// code and, on the third, locks the request out and starts the cooldown.
func (s *Svc) recordWrongEmailChangeAttempt(ctx context.Context, userID int64, requestID uuid.UUID) error {
	count, err := s.repo.IncrementEmailChangeAttempt(ctx, requestID)
	if err != nil {
		return fmt.Errorf("increment email change attempt: %w", err)
	}
	if count >= emailChangeMaxAttempts {
		if err := s.repo.FailEmailChange(ctx, requestID); err != nil {
			s.log.Error("failed to lock out email change request", zap.Int64("user_id", userID), zap.Error(err))
		}
		return &LockedError{RetryAfter: s.emailChangeLockout}
	}
	return &InvalidCodeError{AttemptsRemaining: emailChangeMaxAttempts - int(count)}
}

// CancelEmailChange invalidates the user's pending request, if any. Always
// idempotent — canceling with nothing pending is a success, matching this
// API's DELETE convention.
func (s *Svc) CancelEmailChange(ctx context.Context, id int64) error {
	if err := s.repo.CancelEmailChanges(ctx, id); err != nil {
		return fmt.Errorf("cancel email changes: %w", err)
	}
	return nil
}

// GetEmailChangeStatus reports the user's current email-change state, so a
// client can re-open the verification dialog after a page refresh.
func (s *Svc) GetEmailChangeStatus(ctx context.Context, id int64) (EmailChangeStatus, error) {
	live, err := s.repo.GetLiveEmailChange(ctx, id)
	if err != nil {
		if errors.Is(err, ErrNoPendingEmailChange) {
			return EmailChangeStatus{Pending: false}, nil
		}
		return EmailChangeStatus{}, fmt.Errorf("get live email change: %w", err)
	}
	expiresAt := live.ExpiresAt
	return EmailChangeStatus{
		Pending:           true,
		NewEmail:          live.NewEmail,
		ExpiresAt:         &expiresAt,
		AttemptsRemaining: emailChangeMaxAttempts - int(live.AttemptCount),
	}, nil
}

// enqueueEmailChangeCode mails the OTP to the new address. Failures are
// logged, not returned — matching enqueueVerification, a mail outage must
// not fail the API call (the user can retry the whole flow once mail
// recovers, superseding this request).
func (s *Svc) enqueueEmailChangeCode(ctx context.Context, requestID uuid.UUID, current models.User, newEmail, code string) {
	name := ""
	if current.Name != nil {
		name = *current.Name
	}
	err := s.mailer.Enqueue(ctx, email.EnqueueParams{
		IdempotencyKey: "email_change_code:" + requestID.String(),
		Template:       email.TemplateEmailChangeCode,
		To:             newEmail,
		ToName:         name,
		Payload: map[string]any{
			payloadKeyName:        name,
			payloadKeyCode:        code,
			payloadKeyNewEmail:    newEmail,
			payloadKeyExpiresIn:   formatDuration(s.emailChangeTTL),
			payloadKeyMaxAttempts: emailChangeMaxAttempts,
		},
	})
	if err != nil {
		s.log.Error("failed to enqueue email change code", zap.Int64("user_id", current.ID), zap.Error(err))
	}
}

// formatDuration renders a coarse, human-readable duration for email copy
// ("15 minutes", "1 hour", "2 hours"). Mirrors the ttlHours-to-words
// formatting in auth.PasswordResetSvc.enqueueResetEmail, extended to also
// cover sub-hour durations since the email-change OTP defaults to 15 minutes.
func formatDuration(d time.Duration) string {
	if d < time.Hour {
		minutes := int(d.Minutes())
		if minutes == 1 {
			return "1 minute"
		}
		return fmt.Sprintf("%d minutes", minutes)
	}
	hours := int(d.Hours())
	if hours == 1 {
		return "1 hour"
	}
	return fmt.Sprintf("%d hours", hours)
}

// enqueueEmailChangeRequested notifies the current address that a change was
// requested, so an account owner who didn't initiate it finds out even
// without opening the new (possibly attacker-controlled) inbox.
func (s *Svc) enqueueEmailChangeRequested(ctx context.Context, requestID uuid.UUID, current models.User, newEmail string) {
	name := ""
	if current.Name != nil {
		name = *current.Name
	}
	err := s.mailer.Enqueue(ctx, email.EnqueueParams{
		IdempotencyKey: "email_change_requested:" + requestID.String(),
		Template:       email.TemplateEmailChangeRequested,
		To:             current.Email,
		ToName:         name,
		Payload: map[string]any{
			payloadKeyName:         name,
			payloadKeyNewEmail:     newEmail,
			payloadKeyExpiresIn:    formatDuration(s.emailChangeTTL),
			payloadKeySupportEmail: emailChangeSupportEmail,
		},
	})
	if err != nil {
		s.log.Error("failed to enqueue email change requested notice", zap.Int64("user_id", current.ID), zap.Error(err))
	}
}

// enqueueEmailChangeCompleted notifies the address being replaced that the
// change went through, so a hijacked change is discoverable even though the
// account owner no longer receives mail at the new address.
func (s *Svc) enqueueEmailChangeCompleted(ctx context.Context, requestID uuid.UUID, current models.User, newEmail string) {
	name := ""
	if current.Name != nil {
		name = *current.Name
	}
	err := s.mailer.Enqueue(ctx, email.EnqueueParams{
		IdempotencyKey: "email_change_completed:" + requestID.String(),
		Template:       email.TemplateEmailChangeCompleted,
		To:             current.Email,
		ToName:         name,
		Payload: map[string]any{
			payloadKeyName:         name,
			payloadKeyNewEmail:     newEmail,
			payloadKeySupportEmail: emailChangeSupportEmail,
		},
	})
	if err != nil {
		s.log.Error("failed to enqueue email change completed notice", zap.Int64("user_id", current.ID), zap.Error(err))
	}
}
