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

// Package microsoft implements oidc.IdentityProvider for "Sign in with
// Microsoft" using standards-compliant OIDC discovery and JWKS verification,
// the same shape as the google package.
//
// One thing makes Microsoft different from Google: its multi-tenant aliases
// ("common", "organizations", "consumers") return a discovery document whose
// "issuer" field is a literal template — https://login.microsoftonline.com/{tenantid}/v2.0
// — not a concrete value, because the alias itself resolves to whichever
// tenant the signing-in user belongs to. A real ID token's iss claim always
// has an actual tenant GUID in place of {tenantid}, so it never equals that
// template and go-oidc's standard issuer check would reject every token.
// Moniqo works around this by skipping go-oidc's issuer check and validating
// the issuer's shape itself in VerifyIDToken. Deployments pinned to a single
// tenant (Config.Tenant set to a tenant ID or verified domain) get an exact
// literal match instead, which is strictly stronger.
package microsoft

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

	moniqooidc "github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
)

const (
	issuerPrefix  = "https://login.microsoftonline.com/"
	issuerSuffix  = "/v2.0"
	defaultTenant = "common"
)

// Config holds Microsoft-specific OAuth client configuration.
type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	// Tenant selects which Microsoft Entra ID tenant(s) may sign in:
	// "common" (work/school + personal, default), "organizations"
	// (work/school only), "consumers" (personal only), or a specific tenant
	// ID/verified domain.
	Tenant string
}

// Provider implements oidc.IdentityProvider for Microsoft.
type Provider struct {
	cfg      Config
	oauth2   oauth2.Config
	verifier *oidc.IDTokenVerifier
	tenant   string
}

// New performs OIDC discovery against Microsoft's tenant-scoped issuer and
// returns a ready Provider. Discovery happens once, at startup — a
// request-time login never waits on it.
func New(ctx context.Context, cfg Config) (*Provider, error) {
	tenant := cfg.Tenant
	if tenant == "" {
		tenant = defaultTenant
	}

	p, err := oidc.NewProvider(ctx, issuerPrefix+tenant+issuerSuffix)
	if err != nil {
		return nil, fmt.Errorf("microsoft oidc discovery: %w", err)
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
		// SkipIssuerCheck is safe here because VerifyIDToken performs its own
		// issuer validation below — see the package doc comment.
		verifier: p.Verifier(&oidc.Config{ClientID: cfg.ClientID, SkipIssuerCheck: true}),
		tenant:   tenant,
	}, nil
}

// Name returns the registry key "microsoft".
func (*Provider) Name() string { return "microsoft" }

// AuthURL builds Microsoft's authorization endpoint URL with PKCE and nonce.
// codeChallenge is already the S256 challenge derived from the caller's PKCE
// verifier (see internal/auth/oidc_state.go) — it is passed through verbatim,
// not re-hashed.
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

// microsoftClaims mirrors the subset of Microsoft's ID token claims Moniqo
// needs. It never leaves this package — callers only see the mapped
// Identity.
type microsoftClaims struct {
	Iss           string `json:"iss"`
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// VerifyIDToken validates the ID token's signature, audience, expiry, and
// nonce, then maps its verified claims to an Identity. The issuer is
// validated by shape (https://login.microsoftonline.com/<tenant-guid>/v2.0)
// rather than go-oidc's exact-match check — see the package doc comment for
// why the multi-tenant aliases require this.
func (p *Provider) VerifyIDToken(ctx context.Context, ts *moniqooidc.TokenSet, expectedNonce string) (*moniqooidc.Identity, error) {
	idToken, err := p.verifier.Verify(ctx, ts.IDToken)
	if err != nil {
		return nil, fmt.Errorf("verify id token: %w", err)
	}
	if idToken.Nonce != expectedNonce {
		return nil, errors.New("id token nonce mismatch")
	}

	var claims microsoftClaims
	if err := idToken.Claims(&claims); err != nil {
		return nil, fmt.Errorf("decode id token claims: %w", err)
	}
	if err := p.validateIssuer(claims.Iss); err != nil {
		return nil, err
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

// validateIssuer checks iss against the expected shape for this Provider's
// configured tenant. A pinned tenant (not one of the multi-tenant aliases)
// requires an exact match; an alias only requires the well-known prefix and
// suffix, since the tenant GUID in between varies per signed-in user.
func (p *Provider) validateIssuer(iss string) error {
	switch p.tenant {
	case "common", "organizations", "consumers":
		if !strings.HasPrefix(iss, issuerPrefix) || !strings.HasSuffix(iss, issuerSuffix) {
			return fmt.Errorf("unexpected id token issuer %q", iss)
		}
		return nil
	default:
		if iss != issuerPrefix+p.tenant+issuerSuffix {
			return fmt.Errorf("unexpected id token issuer %q", iss)
		}
		return nil
	}
}
