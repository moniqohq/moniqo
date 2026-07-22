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

// Package oidc defines the provider-agnostic Strategy contract for OpenID
// Connect identity providers (Google, Apple, Facebook, ...). Nothing in this
// package or its concrete provider subpackages knows about Moniqo users,
// budgets, or JWTs — that glue lives in internal/auth. Adding a new provider
// means adding a new subpackage that implements IdentityProvider and
// registering one instance; no other code in this tree changes.
package oidc

import (
	"context"
	"errors"
	"time"
)

// ErrUnknownProvider is returned by ProviderRegistry.Provider when no
// provider is registered under the requested name.
var ErrUnknownProvider = errors.New("unknown identity provider")

// Identity is the provider-agnostic user identity extracted from a verified
// ID token. Provider-specific JSON never crosses this boundary — every
// provider maps its own claims/response shape into this struct internally.
type Identity struct {
	// Provider is the registry key of the provider that produced this
	// identity, e.g. "google".
	Provider string
	// Subject is the provider's stable, unique identifier for the user
	// (the ID token's "sub" claim).
	Subject string

	Email string
	// EmailVerified reports whether the provider itself vouches for Email.
	// Callers must never trust Email when this is false.
	EmailVerified bool

	Name    string
	Picture string
}

// TokenSet is the provider-agnostic result of an authorization code exchange.
type TokenSet struct {
	AccessToken  string
	RefreshToken string // usually empty for Apple/Facebook; Moniqo never persists this
	IDToken      string
	Expiry       time.Time
}

// IdentityProvider is the Strategy interface every concrete OIDC provider
// implements. Callers depend only on this interface — never on a concrete
// provider type, never a switch on provider name.
type IdentityProvider interface {
	// Name returns the registry key for this provider, e.g. "google".
	Name() string

	// AuthURL builds the provider's authorization endpoint URL. state and
	// nonce are opaque caller-generated values embedded verbatim for later
	// verification; codeChallenge is the PKCE S256 challenge.
	AuthURL(state, nonce, codeChallenge string) (string, error)

	// Exchange trades an authorization code and PKCE verifier for a TokenSet.
	Exchange(ctx context.Context, code, codeVerifier string) (*TokenSet, error)

	// VerifyIDToken validates the ID token's signature, issuer, audience,
	// expiry, and nonce, then returns the Identity extracted from its
	// verified claims. This — not an unauthenticated userinfo call — is the
	// trust boundary for Email/EmailVerified/Subject.
	VerifyIDToken(ctx context.Context, ts *TokenSet, expectedNonce string) (*Identity, error)
}

// ProviderRegistry resolves a provider by name. Callers depend only on this
// interface, never on concrete provider types.
type ProviderRegistry interface {
	Provider(name string) (IdentityProvider, error)
}
