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

// Package facebook implements oidc.IdentityProvider for Facebook Login,
// using Facebook's "Limited Login" OIDC-shaped ID token. Facebook has no
// standards-compliant /.well-known/openid-configuration discovery document,
// so unlike Google and Apple, its endpoints are hardcoded constants and the
// verifier is built from a remote JWKS directly rather than via discovery.
//
// This requires the Facebook App to have Limited Login enabled; if it is not,
// the token endpoint returns no id_token and VerifyIDToken has nothing to
// check. That configuration is a Facebook App Dashboard setting, not code.
package facebook

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"

	moniqooidc "github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
)

const (
	fbAuthURL  = "https://www.facebook.com/v19.0/dialog/oauth"
	fbTokenURL = "https://graph.facebook.com/v19.0/oauth/access_token" //nolint:gosec // an endpoint URL, not a credential
	fbJWKSURL  = "https://www.facebook.com/.well-known/oauth/openid/jwks/"
	fbIssuer   = "https://www.facebook.com"

	httpClientTimeout = 10 * time.Second
)

// Config holds Facebook-specific OAuth client configuration.
type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

// Provider implements oidc.IdentityProvider for Facebook.
type Provider struct {
	cfg        Config
	verifier   *oidc.IDTokenVerifier
	httpClient *http.Client
}

// New builds a Provider using a remote JWKS key set rather than discovery,
// since Facebook does not publish a discovery document.
func New(cfg Config) *Provider {
	keySet := oidc.NewRemoteKeySet(context.Background(), fbJWKSURL)
	return &Provider{
		cfg:        cfg,
		verifier:   oidc.NewVerifier(fbIssuer, keySet, &oidc.Config{ClientID: cfg.ClientID}),
		httpClient: &http.Client{Timeout: httpClientTimeout},
	}
}

// Name returns the registry key "facebook".
func (*Provider) Name() string { return "facebook" }

// AuthURL builds Facebook's authorization dialog URL with PKCE.
func (p *Provider) AuthURL(state, nonce, codeChallenge string) (string, error) {
	q := url.Values{
		"response_type":         {"code"},
		"client_id":             {p.cfg.ClientID},
		"redirect_uri":          {p.cfg.RedirectURL},
		"scope":                 {"openid email"},
		"state":                 {state},
		"nonce":                 {nonce},
		"code_challenge":        {codeChallenge},
		"code_challenge_method": {"S256"},
	}
	return fbAuthURL + "?" + q.Encode(), nil
}

// fbTokenError is Facebook's token-endpoint error shape.
type fbTokenError struct {
	Message string `json:"message"`
}

// fbTokenResponse is the token endpoint's JSON response shape.
type fbTokenResponse struct {
	AccessToken string        `json:"access_token"`
	TokenType   string        `json:"token_type"`
	ExpiresIn   int64         `json:"expires_in"`
	IDToken     string        `json:"id_token"`
	Error       *fbTokenError `json:"error"`
}

// Exchange trades an authorization code and PKCE verifier for a TokenSet.
func (p *Provider) Exchange(ctx context.Context, code, codeVerifier string) (*moniqooidc.TokenSet, error) {
	q := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"redirect_uri":  {p.cfg.RedirectURL},
		"client_id":     {p.cfg.ClientID},
		"client_secret": {p.cfg.ClientSecret},
		"code_verifier": {codeVerifier},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fbTokenURL+"?"+q.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("build token request: %w", err)
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("token request: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	var tr fbTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		return nil, fmt.Errorf("decode token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK || tr.Error != nil {
		msg := ""
		if tr.Error != nil {
			msg = tr.Error.Message
		}
		return nil, fmt.Errorf("token exchange rejected: status=%d error=%q", resp.StatusCode, msg)
	}

	// A classic (non-Limited-Login) app returns no id_token; VerifyIDToken
	// then has nothing to check and the caller's unverified-email rule
	// rejects the login rather than trusting an unverifiable identity.
	return &moniqooidc.TokenSet{
		AccessToken: tr.AccessToken,
		IDToken:     tr.IDToken,
		Expiry:      time.Now().Add(time.Duration(tr.ExpiresIn) * time.Second),
	}, nil
}

// fbClaims mirrors the subset of Facebook's Limited Login ID token claims
// Moniqo needs.
type fbClaims struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
}

// VerifyIDToken validates the ID token's signature, issuer, audience,
// expiry, and nonce, then maps its verified claims to an Identity. If ts has
// no IDToken (Limited Login not enabled on the Facebook App), the email
// cannot be verified at all — this returns an error so the caller's
// unverified-email rule applies rather than silently trusting Graph data.
func (p *Provider) VerifyIDToken(ctx context.Context, ts *moniqooidc.TokenSet, expectedNonce string) (*moniqooidc.Identity, error) {
	if ts.IDToken == "" {
		return nil, errors.New("no id_token in token response (Limited Login not enabled?)")
	}

	idToken, err := p.verifier.Verify(ctx, ts.IDToken)
	if err != nil {
		return nil, fmt.Errorf("verify id token: %w", err)
	}
	if idToken.Nonce != expectedNonce {
		return nil, errors.New("id token nonce mismatch")
	}

	var claims fbClaims
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
