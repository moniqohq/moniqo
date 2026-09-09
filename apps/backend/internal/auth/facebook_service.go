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
	"context"

	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
)

// LoginWithFacebookToken verifies a client-obtained Facebook access token and
// either logs the user in or signs them up, per the same priority
// findOrCreateForLogin applies to the redirect providers: an existing linked
// identity always wins; otherwise a verified email may auto-link or (signup
// intent only) create an account. There is no redirect/PKCE/nonce flow here
// — the access token itself, verified against Facebook's Graph API, is the
// only input.
func (s *OIDCSvc) LoginWithFacebookToken(ctx context.Context, accessToken, intent string) (OIDCCallbackResult, error) {
	identity, err := s.verifyFacebookToken(ctx, accessToken)
	if err != nil {
		return OIDCCallbackResult{}, err
	}

	user, err := s.findOrCreateForLogin(ctx, *identity, intent)
	if err != nil {
		return OIDCCallbackResult{}, err
	}
	return s.issueTokens(ctx, user)
}

// LinkFacebookToken verifies a client-obtained Facebook access token and
// links the identity it resolves to userID, applying the same
// never-transfer/never-merge decision tree as linkToUser.
func (s *OIDCSvc) LinkFacebookToken(ctx context.Context, userID int64, accessToken string) error {
	identity, err := s.verifyFacebookToken(ctx, accessToken)
	if err != nil {
		return err
	}
	return s.linkToUser(ctx, userID, *identity)
}

// verifyFacebookToken resolves the Facebook verifier and validates
// accessToken against it. Every failure collapses to ErrTokenExchangeFailed
// — the caller never learns which check failed — matching exchangeAndVerify's
// discipline for the redirect providers.
func (s *OIDCSvc) verifyFacebookToken(ctx context.Context, accessToken string) (*oidc.Identity, error) {
	if s.fbVerifier == nil {
		return nil, ErrUnknownProvider
	}

	identity, err := s.fbVerifier.VerifyAccessToken(ctx, accessToken)
	if err != nil {
		s.log.Debug("facebook token verification failed", zap.Error(err))
		return nil, ErrTokenExchangeFailed
	}
	// Trust the dispatched provider name, not whatever the verifier set —
	// same defensive assignment Callback makes for the redirect providers.
	identity.Provider = s.fbVerifier.Name()
	return identity, nil
}
