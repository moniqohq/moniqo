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
	"time"

	"github.com/google/uuid"
)

// -----------------------------------------------------------------------------
// Handler layer
// -----------------------------------------------------------------------------

// RegisterRequest is the HTTP request body for POST /api/v1/users and the
// service-layer input to Svc.Register.
type RegisterRequest struct {
	Username string  `json:"username"`
	Password string  `json:"password"`
	Email    string  `json:"email"`
	Name     *string `json:"name"`
}

// ReplaceProfileRequest is the HTTP request body for PUT /api/v1/users/{id}.
// All editable fields are required; absent fields become zero values (null/empty).
// Currency, Timezone, and DateFormat are display preferences and stay
// pointer-typed even on a full replace: absent means "no preference set" and
// nulls the column, matching Name's existing optional-pointer treatment.
type ReplaceProfileRequest struct {
	Name       *string `json:"name"`
	Username   string  `json:"username"`
	Email      string  `json:"email"`
	Picture    string  `json:"picture"`
	Currency   *string `json:"currency"`
	Timezone   *string `json:"timezone"`
	DateFormat *string `json:"date_format"`
}

// PatchProfileRequest is the HTTP request body for PATCH /api/v1/users/{id}.
// Only non-nil fields are applied. CurrentPassword + NewPassword trigger a
// password change if both are present.
type PatchProfileRequest struct {
	Name            *string `json:"name"`
	Username        *string `json:"username"`
	Email           *string `json:"email"`
	Picture         *string `json:"picture"`
	Currency        *string `json:"currency"`
	Timezone        *string `json:"timezone"`
	DateFormat      *string `json:"date_format"`
	CurrentPassword *string `json:"current_password"`
	NewPassword     *string `json:"new_password"`
}

// DeleteAccountRequest is the HTTP request body for DELETE /api/v1/users/{id}.
// CurrentPassword re-authenticates the destructive request.
type DeleteAccountRequest struct {
	CurrentPassword *string `json:"current_password"`
}

// DeleteAccountParams carries everything the service and repository need to
// perform the deletion: the id to delete, the re-auth password to verify, and
// the caller's live access-token claims so that token can be blocklisted as
// part of the same transaction.
type DeleteAccountParams struct {
	UserID          int64
	CurrentPassword string
	JTI             uuid.UUID
	ExpiresAt       time.Time
}

// -----------------------------------------------------------------------------
// Repository layer
// -----------------------------------------------------------------------------

// ErrConflict is returned when a unique constraint is violated (username or email).
var ErrConflict = errors.New("username or email already exists")

// ErrNotFound is returned when a user lookup finds no matching row.
var ErrNotFound = errors.New("user not found")

// ErrWrongPassword is returned when the current password doesn't match.
var ErrWrongPassword = errors.New("wrong password")

// ErrInvalidVerificationToken is returned when the token is malformed, expired, or has a bad signature.
var ErrInvalidVerificationToken = errors.New("invalid verification token")

// ErrNoPasswordCredential is returned when account deletion is requested for
// an OIDC-only account that has never set a password (users.hash IS NULL), so
// there is nothing to verify the re-authentication password against.
var ErrNoPasswordCredential = errors.New("account has no password credential")

// ErrLastOwner is returned when the user is the sole OWNER of a budget that
// still has other active members — deleting the account would otherwise
// leave that budget ownerless or force an implicit cascade over data that
// belongs to other users. The caller must transfer ownership or remove the
// other members first.
var ErrLastOwner = errors.New("cannot delete account: sole owner of a shared budget")

// BlockingBudget identifies a budget that blocks account deletion because the
// user is its sole OWNER and other active members still belong to it.
type BlockingBudget struct {
	ID    int64
	Title string
}

// LastOwnerError wraps ErrLastOwner with the specific budgets that block
// deletion, so the handler can name them in the response message.
type LastOwnerError struct {
	Budgets []BlockingBudget
}

func (*LastOwnerError) Error() string {
	return ErrLastOwner.Error()
}

// Is reports true for ErrLastOwner so callers can use errors.Is(err, ErrLastOwner).
func (*LastOwnerError) Is(target error) bool {
	return target == ErrLastOwner //nolint:err113
}

// CreateParams holds the values needed to insert a new user row.
type CreateParams struct {
	Username string
	Email    string
	Hash     string
	Name     *string
}

// UpdateProfileParams holds the values for a full or partial profile update.
type UpdateProfileParams struct {
	ID         int64
	Name       *string
	Username   string
	Email      string
	Picture    string
	Currency   *string
	Timezone   *string
	DateFormat *string
}
