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
	"io"
	"time"
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

// -----------------------------------------------------------------------------
// Avatar / profile picture
// -----------------------------------------------------------------------------

// ErrNoPicture is returned when a user has neither an uploaded avatar nor an
// external (OIDC) picture set.
var ErrNoPicture = errors.New("no picture")

// ErrStorageUnavailable is returned when an avatar upload/get/delete is
// attempted but no storage.Storage has been wired via Svc.SetStorage.
var ErrStorageUnavailable = errors.New("avatar storage unavailable")

// AvatarMeta describes the currently stored avatar for a user, as recorded in
// the users.avatar_* columns. A zero-value AvatarMeta (empty Key) means no
// file is stored locally — the user may still have an external Picture URL
// (e.g. from OIDC).
type AvatarMeta struct {
	Key         string
	ContentType string
	Size        int64
	ETag        string
	UpdatedAt   *time.Time
}

// SetAvatarParams holds the values persisted when an avatar upload succeeds.
type SetAvatarParams struct {
	ID          int64
	Key         string
	ContentType string
	ETag        string
	Size        int64
	PublicURL   string // the stable API URL written to users.picture
}

// PictureUpload holds a validated, sniffed image ready to be stored.
type PictureUpload struct {
	Data        []byte
	ContentType string // one of the allowlisted constants in validator/image sniffing
	ETag        string // hex sha256 of Data
}

// PictureKind distinguishes how a user's profile picture should be served.
type PictureKind int

const (
	// PictureNone means the user has no picture at all.
	PictureNone PictureKind = iota
	// PictureStored means the picture is held in local/object storage and
	// should be streamed back to the client.
	PictureStored
	// PictureExternal means the picture is an absolute URL (e.g. from OIDC)
	// and the client should be redirected there.
	PictureExternal
)

// PictureResult is returned by Service.OpenPicture. Body is non-nil only when
// Kind is PictureStored, and the caller must Close it.
type PictureResult struct {
	Kind        PictureKind
	Body        io.ReadCloser
	Meta        AvatarMeta
	ExternalURL string
}
