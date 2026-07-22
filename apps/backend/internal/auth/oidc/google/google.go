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

// Package google implements oidc.IdentityProvider for Google Sign-In using
// standards-compliant OIDC discovery and JWKS verification.
package google

import (
	"context"
	"errors"
	"fmt"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

	moniqooidc "github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
)

const issuerURL = "https://accounts.google.com"

// Config holds Google-specific OAuth client configuration.
type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

// Provider implements oidc.IdentityProvider for Google.
type Provider struct {
	cfg      Config
	oauth2   oauth2.Config
	verifier *oidc.IDTokenVerifier
}

// New performs OIDC discovery against Google's issuer and returns a ready
// Provider. Discovery happens once, at startup — a request-time login never
// waits on it.
func New(ctx context.Context, cfg Config) (*Provider, error) {
	p, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		return nil, fmt.Errorf("google oidc discovery: %w", err)
	}

	return &Provider{
		cfg: cfg,
		oauth2: oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			RedirectURL:  cfg.RedirectURL,
			Endpoint:     p.Endpoint(),
			Scopes:       []string{oidc.ScopeOpenID, "email", "profile"},
		},
		verifier: p.Verifier(&oidc.Config{ClientID: cfg.ClientID}),
	}, nil
}

// Name returns the registry key "google".
func (*Provider) Name() string { return "google" }

// AuthURL builds Google's authorization endpoint URL with PKCE and nonce.
// codeChallenge is already the S256 challenge derived from the caller's PKCE
// verifier (see internal/auth/oidc_state.go) — it is passed through verbatim,
// not re-hashed. access_type is deliberately left at its default (online) —
// Moniqo never requests or persists Google refresh tokens.
func (p *Provider) AuthURL(state, nonce, codeChallenge string) (string, error) {
	return p.oauth2.AuthCodeURL(
		state,
		oidc.Nonce(nonce),
		oauth2.SetAuthURLParam("code_challenge", codeChallenge),
		oauth2.SetAuthURLParam("code_challenge_method", "S256"),
	), nil
}

// Exchange trades an authorization code and PKCE verifier for a TokenSet.
func (p *Provider) Exchange(ctx context.Context, code, codeVerifier string) (*moniqooidc.TokenSet, error) {
	tok, err := p.oauth2.Exchange(ctx, code, oauth2.VerifierOption(codeVerifier))
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}

	rawIDToken, ok := tok.Extra("id_token").(string)
	if !ok || rawIDToken == "" {
		return nil, errors.New("token response missing id_token")
	}

	return &moniqooidc.TokenSet{
		AccessToken:  tok.AccessToken,
		RefreshToken: tok.RefreshToken,
		IDToken:      rawIDToken,
		Expiry:       tok.Expiry,
	}, nil
}

// googleClaims mirrors the subset of Google's ID token claims Moniqo needs.
// It never leaves this package — callers only see the mapped Identity.
type googleClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// VerifyIDToken validates the ID token's signature, issuer, audience,
// expiry, and nonce, then maps its verified claims to an Identity.
func (p *Provider) VerifyIDToken(ctx context.Context, ts *moniqooidc.TokenSet, expectedNonce string) (*moniqooidc.Identity, error) {
	idToken, err := p.verifier.Verify(ctx, ts.IDToken)
	if err != nil {
		return nil, fmt.Errorf("verify id token: %w", err)
	}
	if idToken.Nonce != expectedNonce {
		return nil, errors.New("id token nonce mismatch")
	}

	var claims googleClaims
	if err := idToken.Claims(&claims); err != nil {
		return nil, fmt.Errorf("decode id token claims: %w", err)
	}

	return &moniqooidc.Identity{
		Provider:      p.Name(),
		Subject:       claims.Sub,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified,
		Name:          claims.Name,
		Picture:       claims.Picture,
	}, nil
}
