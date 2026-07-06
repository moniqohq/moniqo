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

import "errors"

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
type ReplaceProfileRequest struct {
	Name     *string `json:"name"`
	Username string  `json:"username"`
	Email    string  `json:"email"`
	Picture  string  `json:"picture"`
}

// PatchProfileRequest is the HTTP request body for PATCH /api/v1/users/{id}.
// Only non-nil fields are applied. CurrentPassword + NewPassword trigger a
// password change if both are present.
type PatchProfileRequest struct {
	Name            *string `json:"name"`
	Username        *string `json:"username"`
	Email           *string `json:"email"`
	Picture         *string `json:"picture"`
	CurrentPassword *string `json:"current_password"`
	NewPassword     *string `json:"new_password"`
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

// CreateParams holds the values needed to insert a new user row.
type CreateParams struct {
	Username string
	Email    string
	Hash     string
	Name     *string
}

// UpdateProfileParams holds the values for a full or partial profile update.
type UpdateProfileParams struct {
	ID       int64
	Name     *string
	Username string
	Email    string
	Picture  string
}
