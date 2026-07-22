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

package mock

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// OIDCRepository is a testify mock for auth.OIDCRepository.
type OIDCRepository struct {
	mock.Mock
}

// GetUserByEmailForLinking records the call and returns the stubbed user.
func (m *OIDCRepository) GetUserByEmailForLinking(_ context.Context, email string) (auth.LinkableUser, error) {
	args := m.Called(email)
	u, ok := args.Get(0).(auth.LinkableUser)
	if !ok {
		return auth.LinkableUser{}, args.Error(1)
	}
	return u, args.Error(1)
}

// CreateUserFromIdentity records the call and returns the stubbed user.
func (m *OIDCRepository) CreateUserFromIdentity(_ context.Context, p auth.CreateOIDCUserParams) (models.User, error) {
	args := m.Called(p)
	u, ok := args.Get(0).(models.User)
	if !ok {
		return models.User{}, args.Error(1)
	}
	return u, args.Error(1)
}

// GetIdentityByProviderSubject records the call and returns the stubbed identity.
func (m *OIDCRepository) GetIdentityByProviderSubject(_ context.Context, provider, subject string) (auth.UserIdentity, error) {
	args := m.Called(provider, subject)
	id, ok := args.Get(0).(auth.UserIdentity)
	if !ok {
		return auth.UserIdentity{}, args.Error(1)
	}
	return id, args.Error(1)
}

// LinkIdentity records the call and returns the stubbed error.
func (m *OIDCRepository) LinkIdentity(_ context.Context, userID int64, provider, subject, email string) error {
	args := m.Called(userID, provider, subject, email)
	return args.Error(0)
}

// ListIdentities records the call and returns the stubbed identities.
func (m *OIDCRepository) ListIdentities(_ context.Context, userID int64) ([]auth.UserIdentity, error) {
	args := m.Called(userID)
	identities, ok := args.Get(0).([]auth.UserIdentity)
	if !ok {
		return nil, args.Error(1)
	}
	return identities, args.Error(1)
}

// UnlinkIdentity records the call and returns the stubbed error.
func (m *OIDCRepository) UnlinkIdentity(_ context.Context, userID int64, provider string) error {
	args := m.Called(userID, provider)
	return args.Error(0)
}

// CountIdentitiesAndHash records the call and returns the stubbed counts.
func (m *OIDCRepository) CountIdentitiesAndHash(_ context.Context, userID int64) (int, bool, error) {
	const errArgIndex = 2
	args := m.Called(userID)
	count, ok := args.Get(0).(int)
	if !ok {
		return 0, false, args.Error(errArgIndex)
	}
	hasPassword, ok := args.Get(1).(bool)
	if !ok {
		return 0, false, args.Error(errArgIndex)
	}
	return count, hasPassword, args.Error(errArgIndex)
}

// ActivateUser records the call and returns the stubbed error.
func (m *OIDCRepository) ActivateUser(_ context.Context, userID int64) error {
	args := m.Called(userID)
	return args.Error(0)
}

// OIDCService is a test double for auth.OIDCService.
type OIDCService struct {
	InitiateLoginFn  func(providerName string) (redirectURL, flowToken string, err error)
	InitiateLinkFn   func(providerName string, userID int64) (redirectURL, flowToken string, err error)
	CallbackFn       func(ctx context.Context, providerName, code, stateParam, flowCookieRaw string) (auth.OIDCCallbackResult, error)
	ListIdentitiesFn func(ctx context.Context, userID int64) ([]auth.UserIdentity, error)
	UnlinkFn         func(ctx context.Context, userID int64, providerName string) error
}

// InitiateLogin delegates to InitiateLoginFn.
func (m *OIDCService) InitiateLogin(providerName string) (redirectURL, flowToken string, err error) {
	return m.InitiateLoginFn(providerName)
}

// InitiateLink delegates to InitiateLinkFn.
func (m *OIDCService) InitiateLink(providerName string, userID int64) (redirectURL, flowToken string, err error) {
	return m.InitiateLinkFn(providerName, userID)
}

// Callback delegates to CallbackFn.
func (m *OIDCService) Callback(ctx context.Context, providerName, code, stateParam, flowCookieRaw string) (auth.OIDCCallbackResult, error) {
	return m.CallbackFn(ctx, providerName, code, stateParam, flowCookieRaw)
}

// ListIdentities delegates to ListIdentitiesFn.
func (m *OIDCService) ListIdentities(ctx context.Context, userID int64) ([]auth.UserIdentity, error) {
	return m.ListIdentitiesFn(ctx, userID)
}

// Unlink delegates to UnlinkFn.
func (m *OIDCService) Unlink(ctx context.Context, userID int64, providerName string) error {
	return m.UnlinkFn(ctx, userID, providerName)
}

// IdentityProvider is a test double for oidc.IdentityProvider.
type IdentityProvider struct {
	NameFn          func() string
	AuthURLFn       func(state, nonce, codeChallenge string) (string, error)
	ExchangeFn      func(ctx context.Context, code, codeVerifier string) (*oidc.TokenSet, error)
	VerifyIDTokenFn func(ctx context.Context, ts *oidc.TokenSet, expectedNonce string) (*oidc.Identity, error)
}

// Name delegates to NameFn.
func (m *IdentityProvider) Name() string { return m.NameFn() }

// AuthURL delegates to AuthURLFn.
func (m *IdentityProvider) AuthURL(state, nonce, codeChallenge string) (string, error) {
	return m.AuthURLFn(state, nonce, codeChallenge)
}

// Exchange delegates to ExchangeFn.
func (m *IdentityProvider) Exchange(ctx context.Context, code, codeVerifier string) (*oidc.TokenSet, error) {
	return m.ExchangeFn(ctx, code, codeVerifier)
}

// VerifyIDToken delegates to VerifyIDTokenFn.
func (m *IdentityProvider) VerifyIDToken(ctx context.Context, ts *oidc.TokenSet, expectedNonce string) (*oidc.Identity, error) {
	return m.VerifyIDTokenFn(ctx, ts, expectedNonce)
}

// ProviderRegistry is a test double for oidc.ProviderRegistry.
type ProviderRegistry struct {
	ProviderFn func(name string) (oidc.IdentityProvider, error)
}

// Provider delegates to ProviderFn.
//
//nolint:ireturn // mirrors oidc.ProviderRegistry, which returns the Strategy interface by design
func (m *ProviderRegistry) Provider(name string) (oidc.IdentityProvider, error) {
	return m.ProviderFn(name)
}
