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

// Package facebook implements oidc.TokenVerifier for Facebook Login.
//
// Facebook has no web-compatible signed id_token: its only such mechanism,
// Limited Login, is iOS-only (the web JS SDK's authResponse never contains
// an id_token, only a classic opaque access token). So unlike Google and
// Microsoft, Facebook is not an authorization-code redirect provider here —
// the browser obtains a user access token directly via FB.login() and hands
// it to us, and this package verifies that token against Facebook's Graph
// API rather than verifying a signed JWT.
//
// The email-verification signal is correspondingly weaker than Google/
// Microsoft's cryptographic id_token claim: Graph's /me omits the email
// field entirely unless Meta considers the address confirmed (documented
// behavior, not something this package can independently verify), so
// Identity.EmailVerified here is policy-based trust in Meta, not a proof
// this package checked itself.
package facebook

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"time"

	moniqooidc "github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
)

// defaultGraphBaseURL is pinned to a specific Graph API version deliberately
// — the unversioned graph.facebook.com host resolves to the oldest still-live
// version, which Meta periodically retires out from under callers that never
// pin one.
const defaultGraphBaseURL = "https://graph.facebook.com/v21.0"

const httpClientTimeout = 5 * time.Second

// tokenTypeUser is the only debug_token "type" this package accepts. An app
// access token or a Page/system-user token can also be "is_valid" and carry
// our own app_id, so type must be checked too, not just app_id.
const tokenTypeUser = "USER"

// sentinel errors. Deliberately generic and never wrap a Graph HTTP error
// verbatim: a failed request's *url.Error embeds the full request URL, which
// for the debug_token call contains "access_token=<app_id>|<app_secret>" —
// wrapping it would put the app secret in logs.
var (
	ErrGraphRequestFailed = errors.New("facebook graph api request failed")
	ErrTokenInvalid       = errors.New("facebook access token invalid or not issued for this app")
	ErrProfileMismatch    = errors.New("facebook profile did not match the verified token")
)

// Config holds Facebook app credentials.
type Config struct {
	ClientID     string // the Facebook App ID
	ClientSecret string // the Facebook App Secret
}

// Verifier implements oidc.TokenVerifier for Facebook.
type Verifier struct {
	cfg          Config
	graphBaseURL string
	httpClient   *http.Client
}

// New builds a Verifier using the real Graph API.
func New(cfg Config) *Verifier {
	return &Verifier{
		cfg:          cfg,
		graphBaseURL: defaultGraphBaseURL,
		httpClient:   &http.Client{Timeout: httpClientTimeout},
	}
}

// Name returns the registry key "facebook".
func (*Verifier) Name() string { return "facebook" }

// debugTokenResponse is the shape of a successful GET /debug_token response.
type debugTokenResponse struct {
	Data struct {
		AppID     string   `json:"app_id"`
		Type      string   `json:"type"`
		IsValid   bool     `json:"is_valid"`
		UserID    string   `json:"user_id"`
		ExpiresAt int64    `json:"expires_at"`
		Scopes    []string `json:"scopes"`
	} `json:"data"`
	Error *graphError `json:"error"`
}

// graphError is Graph API's shared error shape, returned at top level (not
// under "data") on a non-200 response.
type graphError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    int    `json:"code"`
}

// meResponse is the subset of GET /me Moniqo needs.
type meResponse struct {
	ID      string      `json:"id"`
	Name    string      `json:"name"`
	Email   string      `json:"email"`
	Picture pictureData `json:"picture"`
	Error   *graphError `json:"error"`
}

type pictureData struct {
	Data struct {
		URL string `json:"url"`
	} `json:"data"`
}

// VerifyAccessToken validates accessToken via Graph's debug_token endpoint
// (asserting it is valid, of type USER, and was issued for this app — the
// check that stops a token minted for a different Facebook app from being
// replayed to us) and then fetches the profile it authorizes. Subject comes
// from debug_token's user_id, never from the profile call, and the two are
// cross-checked against each other.
func (v *Verifier) VerifyAccessToken(ctx context.Context, accessToken string) (*moniqooidc.Identity, error) {
	debug, err := v.debugToken(ctx, accessToken)
	if err != nil {
		return nil, err
	}
	if err := v.validateDebugToken(debug); err != nil {
		return nil, err
	}

	profile, err := v.fetchProfile(ctx, accessToken)
	if err != nil {
		return nil, err
	}
	if profile.ID != debug.Data.UserID {
		return nil, ErrProfileMismatch
	}

	return &moniqooidc.Identity{
		Provider:      "facebook",
		Subject:       debug.Data.UserID,
		Email:         profile.Email,
		EmailVerified: profile.Email != "",
		Name:          profile.Name,
		Picture:       profile.Picture.Data.URL,
	}, nil
}

func (v *Verifier) validateDebugToken(debug *debugTokenResponse) error {
	d := debug.Data
	switch {
	case !d.IsValid, d.AppID != v.cfg.ClientID, d.Type != tokenTypeUser, d.UserID == "", d.ExpiresAt == 0:
		return ErrTokenInvalid
	default:
		return nil
	}
}

func (v *Verifier) debugToken(ctx context.Context, accessToken string) (*debugTokenResponse, error) {
	appToken := v.cfg.ClientID + "|" + v.cfg.ClientSecret
	q := url.Values{
		"input_token":  {accessToken},
		"access_token": {appToken},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.graphBaseURL+"/debug_token?"+q.Encode(), nil)
	if err != nil {
		return nil, fmt.Errorf("build debug_token request: %w", err)
	}

	resp, err := v.httpClient.Do(req)
	if err != nil {
		// Deliberately not %w-wrapped: err's message may embed the request
		// URL, which contains the app secret.
		return nil, ErrGraphRequestFailed
	}
	defer resp.Body.Close() //nolint:errcheck

	var body debugTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode debug_token response: %w", err)
	}
	if resp.StatusCode != http.StatusOK || body.Error != nil {
		return nil, ErrTokenInvalid
	}
	return &body, nil
}

func (v *Verifier) fetchProfile(ctx context.Context, accessToken string) (*meResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.graphBaseURL+"/me?fields=id,name,email,picture", nil)
	if err != nil {
		return nil, fmt.Errorf("build me request: %w", err)
	}
	// The user access token travels in a header, never a query param, so it
	// never lands in a URL, an access log, or an *url.Error message.
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := v.httpClient.Do(req)
	if err != nil {
		return nil, ErrGraphRequestFailed
	}
	defer resp.Body.Close() //nolint:errcheck

	var body meResponse
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("decode me response: %w", err)
	}
	if resp.StatusCode != http.StatusOK || body.Error != nil {
		return nil, ErrTokenInvalid
	}
	return &body, nil
}
