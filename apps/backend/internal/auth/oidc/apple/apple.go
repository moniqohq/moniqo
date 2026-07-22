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

// Package apple implements oidc.IdentityProvider for Sign in with Apple.
//
// Two things make Apple different from Google/Facebook:
//  1. Its "client secret" is not a static value — it's a short-lived
//     ES256-signed JWT minted per request (see apple_client_secret.go).
//  2. Its web authorization flow uses response_mode=form_post, so the
//     identity provider's redirect back to Moniqo is a cross-site POST with
//     a form-encoded body, not a GET with query parameters. The generic
//     callback handler in internal/auth already reads callback parameters
//     via Echo's FormValue, which transparently covers both cases, and the
//     flow-state cookie is SameSite=Lax (not Strict) specifically so it
//     survives that cross-site POST.
package apple

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"

	moniqooidc "github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
)

const (
	issuerURL         = "https://appleid.apple.com"
	authURL           = "https://appleid.apple.com/auth/authorize"
	tokenURL          = "https://appleid.apple.com/auth/token" //nolint:gosec // an endpoint URL, not a credential
	httpClientTimeout = 10 * time.Second
)

// Config holds Apple-specific client configuration.
type Config struct {
	ClientID    string // the Services ID registered with Apple
	TeamID      string
	KeyID       string
	PrivateKey  string // PEM-encoded EC private key content
	RedirectURL string
}

// Provider implements oidc.IdentityProvider for Apple.
type Provider struct {
	cfg        Config
	verifier   *oidc.IDTokenVerifier
	httpClient *http.Client
}

// New performs OIDC discovery against Apple's issuer (for JWKS-based ID
// token verification) and returns a ready Provider.
func New(ctx context.Context, cfg Config) (*Provider, error) {
	p, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		return nil, fmt.Errorf("apple oidc discovery: %w", err)
	}

	return &Provider{
		cfg:        cfg,
		verifier:   p.Verifier(&oidc.Config{ClientID: cfg.ClientID}),
		httpClient: &http.Client{Timeout: httpClientTimeout},
	}, nil
}

// Name returns the registry key "apple".
func (*Provider) Name() string { return "apple" }

// AuthURL builds Apple's authorization endpoint URL. response_mode=form_post
// is required for the "name email" scope Apple returns on web; Apple's ID
// token includes email/email_verified regardless, so no scope is requested
// beyond the mandatory openid.
func (p *Provider) AuthURL(state, nonce, codeChallenge string) (string, error) {
	q := url.Values{
		"response_type":         {"code"},
		"response_mode":         {"form_post"},
		"client_id":             {p.cfg.ClientID},
		"redirect_uri":          {p.cfg.RedirectURL},
		"scope":                 {"openid email"},
		"state":                 {state},
		"nonce":                 {nonce},
		"code_challenge":        {codeChallenge},
		"code_challenge_method": {"S256"},
	}
	return authURL + "?" + q.Encode(), nil
}

// appleTokenResponse is the token endpoint's JSON response shape. It never
// leaves this package.
type appleTokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	Error        string `json:"error"`
}

// Exchange trades an authorization code and PKCE verifier for a TokenSet.
// Apple's client secret is minted fresh for this call — see
// apple_client_secret.go.
func (p *Provider) Exchange(ctx context.Context, code, codeVerifier string) (*moniqooidc.TokenSet, error) {
	clientSecret, err := buildClientSecret(p.cfg)
	if err != nil {
		return nil, fmt.Errorf("build client secret: %w", err)
	}

	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {p.cfg.RedirectURL},
		"client_id":     {p.cfg.ClientID},
		"client_secret": {clientSecret},
		"code_verifier": {codeVerifier},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, tokenURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("build token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	var tr appleTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return nil, fmt.Errorf("decode token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK || tr.Error != "" || tr.IDToken == "" {
		return nil, fmt.Errorf("token exchange rejected: status=%d error=%q", resp.StatusCode, tr.Error)
	}

	return &moniqooidc.TokenSet{
		AccessToken:  tr.AccessToken,
		RefreshToken: tr.RefreshToken,
		IDToken:      tr.IDToken,
		Expiry:       time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second),
	}, nil
}

// appleClaims mirrors the subset of Apple's ID token claims Moniqo needs.
// email_verified arrives from Apple as either a bool or a string depending
// on flow, hence the custom type.
type appleClaims struct {
	Sub           string       `json:"sub"`
	Email         string       `json:"email"`
	EmailVerified appleBoolish `json:"email_verified"`
}

// appleBoolish decodes Apple's email_verified claim, which is sometimes the
// string "true"/"false" rather than a JSON boolean.
type appleBoolish bool

func (b *appleBoolish) UnmarshalJSON(data []byte) error {
	s := strings.Trim(string(data), `"`)
	*b = appleBoolish(s == "true")
	return nil
}

// VerifyIDToken validates the ID token's signature, issuer, audience,
// expiry, and nonce, then maps its verified claims to an Identity. Apple's
// ID token carries no name/picture claims (name is only ever sent once, in
// the initial authorization form body, never in the token) — Moniqo simply
// leaves those fields empty for Apple sign-ins.
func (p *Provider) VerifyIDToken(ctx context.Context, ts *moniqooidc.TokenSet, expectedNonce string) (*moniqooidc.Identity, error) {
	idToken, err := p.verifier.Verify(ctx, ts.IDToken)
	if err != nil {
		return nil, fmt.Errorf("verify id token: %w", err)
	}
	if idToken.Nonce != expectedNonce {
		return nil, errors.New("id token nonce mismatch")
	}

	var claims appleClaims
	if err := idToken.Claims(&claims); err != nil {
		return nil, fmt.Errorf("decode id token claims: %w", err)
	}

	return &moniqooidc.Identity{
		Provider:      p.Name(),
		Subject:       claims.Sub,
		Email:         claims.Email,
		EmailVerified: bool(claims.EmailVerified),
	}, nil
}
