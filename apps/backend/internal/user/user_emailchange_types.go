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
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// -----------------------------------------------------------------------------
// Handler layer
// -----------------------------------------------------------------------------

// RequestEmailChangeRequest is the HTTP request body for
// POST /api/v1/users/{id}/email-change.
type RequestEmailChangeRequest struct {
	NewEmail        string  `json:"new_email"`
	CurrentPassword *string `json:"current_password"`
}

// VerifyEmailChangeRequest is the HTTP request body for
// POST /api/v1/users/{id}/email-change/verify.
type VerifyEmailChangeRequest struct {
	Code string `json:"code"`
}

// EmailChangeStatus is the client-visible state of the flow, returned by
// RequestEmailChange and GetEmailChangeStatus.
type EmailChangeStatus struct {
	Pending           bool       `json:"pending"`
	NewEmail          string     `json:"new_email,omitempty"`
	ExpiresAt         *time.Time `json:"expires_at,omitempty"`
	AttemptsRemaining int        `json:"attempts_remaining"`
	RetryAfterSeconds int        `json:"retry_after_seconds,omitempty"`
}

// -----------------------------------------------------------------------------
// Sentinel and typed errors
// -----------------------------------------------------------------------------

// ErrEmailReadOnly is returned when a caller attempts to change email through
// a profile endpoint (PUT/PATCH /api/v1/users/{id}). Changing an email
// requires the OTP-verified flow below.
var ErrEmailReadOnly = errors.New("email is read-only on this endpoint")

// ErrSameEmail is returned when the requested new email matches the current
// one (case-insensitively) — there is nothing to verify.
var ErrSameEmail = errors.New("new email matches current email")

// ErrNoPendingEmailChange is returned when verifying or canceling a change
// but no live request exists for the user (none was ever made, it already
// completed, expired past the sweep window, or was already cancelled).
var ErrNoPendingEmailChange = errors.New("no pending email change request")

// InvalidCodeError reports a wrong or expired OTP and how many verification
// attempts remain before the request is invalidated and a cooldown begins.
// Expired and wrong codes are reported identically (AttemptsRemaining: 0 for
// an expired code) so a client cannot distinguish "you were too slow" from
// "you guessed wrong" — no information the flow doesn't already need.
type InvalidCodeError struct {
	AttemptsRemaining int
}

func (e *InvalidCodeError) Error() string {
	return fmt.Sprintf("invalid or expired code, %d attempts remaining", e.AttemptsRemaining)
}

// LockedError reports that the user is inside the post-lockout cooldown
// (three wrong codes) and must wait RetryAfter before requesting again.
type LockedError struct {
	RetryAfter time.Duration
}

func (e *LockedError) Error() string {
	return fmt.Sprintf("too many verification attempts, retry after %s", e.RetryAfter)
}

// -----------------------------------------------------------------------------
// Repository layer
// -----------------------------------------------------------------------------

// EmailChangeRequest is the repository-layer view of an email_change_requests
// row.
type EmailChangeRequest struct {
	ID           uuid.UUID
	UserID       int64
	NewEmail     string
	CodeHash     string
	AttemptCount int32
	ExpiresAt    time.Time
	ConsumedAt   *time.Time
	FailedAt     *time.Time
	CreatedAt    time.Time
}

// CreateEmailChangeParams holds the values needed to insert a new
// email_change_requests row.
type CreateEmailChangeParams struct {
	ID        uuid.UUID
	UserID    int64
	NewEmail  string
	CodeHash  string
	ExpiresAt time.Time
}
