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

package auth

import (
	"errors"
	"time"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Sentinel errors for the OIDC login/link/unlink flows. These stay generic at
// the handler boundary — none of them reveal which specific check failed.
var (
	// ErrUnknownProvider is returned when the :provider path segment does not
	// match any registered identity provider.
	ErrUnknownProvider = errors.New("unknown identity provider")
	// ErrInvalidState covers any flow-cookie failure: missing, tampered,
	// expired, or a state/provider mismatch with the callback parameters.
	ErrInvalidState = errors.New("invalid oauth state")
	// ErrTokenExchangeFailed covers any failure exchanging the authorization
	// code or verifying the resulting ID token (signature, issuer, audience,
	// expiry, or nonce) — kept generic so the callback never reveals which
	// check failed.
	ErrTokenExchangeFailed = errors.New("token exchange failed")
	// ErrIdentityNotVerified is returned when the provider's ID token does
	// not assert a verified email. Moniqo never creates or links an account
	// from an unverified provider identity.
	ErrIdentityNotVerified = errors.New("identity email not verified")
	// ErrEmailAlreadyExists is returned when linking a provider identity
	// whose verified email belongs to a different Moniqo account — accounts
	// are never merged automatically.
	ErrEmailAlreadyExists = errors.New("email already linked to another account")
	// ErrIdentityAlreadyLinked is returned when linking a provider identity
	// that is already linked to a different Moniqo account.
	ErrIdentityAlreadyLinked = errors.New("identity already linked to another account")
	// ErrProviderUnavailable is returned when a provider is registered but
	// currently cannot service a request (reserved for future use, e.g.
	// health-checked outages); distinct from ErrUnknownProvider.
	ErrProviderUnavailable = errors.New("identity provider unavailable")
	// ErrLastCredential is returned when unlinking would leave the user with
	// no way to sign in (no password and no other linked identity).
	ErrLastCredential = errors.New("cannot remove your only sign-in method")
	// ErrIdentityNotFound is returned when no user_identities row matches a
	// (provider, subject) lookup.
	ErrIdentityNotFound = errors.New("identity not found")
	// ErrConflict is returned when a derived username collides on insert;
	// CreateUserFromIdentity retries internally before ever surfacing this.
	ErrConflict = errors.New("username already exists")
)

// -----------------------------------------------------------------------------
// Repository layer
// -----------------------------------------------------------------------------

// UserIdentity is the internal representation of a user_identities row.
type UserIdentity struct {
	ID              int64
	UserID          int64
	Provider        string
	ProviderSubject string
	ProviderEmail   string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// LinkableUser is the minimal user data needed to make linking decisions —
// deliberately excludes the password hash, since OIDC linking is never
// password-aware.
type LinkableUser struct {
	ID       int64
	Username string
	Email    string
	Status   models.UserStatus
}

// CreateOIDCUserParams holds the values needed to create a new OIDC-only user
// (no password) together with its first linked identity, in one transaction.
type CreateOIDCUserParams struct {
	Username        string
	Email           string
	Name            *string
	Picture         string
	Provider        string
	ProviderSubject string
	ProviderEmail   string
}

// -----------------------------------------------------------------------------
// Service layer
// -----------------------------------------------------------------------------

// OIDCLoginResult carries the outcome of a successful login or link callback.
type OIDCLoginResult struct {
	AccessToken           string
	RefreshToken          string
	RefreshTokenExpiresAt time.Time
	// IsLink is true when the callback completed a link flow (no new tokens
	// are issued in that case — the user was already authenticated).
	IsLink bool
}
