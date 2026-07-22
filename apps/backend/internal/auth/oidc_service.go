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
	"errors"
	"fmt"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

const (
	minDerivedUsernameLen = 8
	maxDerivedUsernameLen = 12
)

// OIDCRepository is the persistence contract required by OIDCSvc, scoped to
// user_identities and OIDC-only user creation. It deliberately does not
// duplicate UpdateLastLogin/GetUserByID — those are reused from the
// composed *Svc's existing Repository.
type OIDCRepository interface {
	GetUserByEmailForLinking(ctx context.Context, email string) (LinkableUser, error)
	CreateUserFromIdentity(ctx context.Context, p CreateOIDCUserParams) (models.User, error)
	GetIdentityByProviderSubject(ctx context.Context, provider, subject string) (UserIdentity, error)
	LinkIdentity(ctx context.Context, userID int64, provider, subject, email string) error
	ListIdentities(ctx context.Context, userID int64) ([]UserIdentity, error)
	UnlinkIdentity(ctx context.Context, userID int64, provider string) error
	CountIdentitiesAndHash(ctx context.Context, userID int64) (identityCount int, hasPassword bool, err error)
	ActivateUser(ctx context.Context, userID int64) error
}

// OIDCSvc implements the OIDC login/link/unlink business logic. It composes
// the existing auth Svc to reuse JWT issuance, refresh-token issuance, and
// last-login bookkeeping rather than duplicating them.
type OIDCSvc struct {
	repo        OIDCRepository
	registry    oidc.ProviderRegistry
	authSvc     *Svc
	stateSecret []byte
	log         *zap.Logger
}

// NewOIDCSvc returns an OIDCSvc wired to the given dependencies.
func NewOIDCSvc(repo OIDCRepository, registry oidc.ProviderRegistry, authSvc *Svc, stateSecret []byte, log *zap.Logger) *OIDCSvc {
	return &OIDCSvc{repo: repo, registry: registry, authSvc: authSvc, stateSecret: stateSecret, log: log}
}

// InitiateLogin resolves the provider and returns its authorization URL
// alongside a signed flow-state token for the handler to place in the OIDC
// flow cookie.
func (s *OIDCSvc) InitiateLogin(providerName string) (redirectURL, flowToken string, err error) {
	return s.initiate(providerName, oidcPurposeLogin, 0)
}

// InitiateLink is InitiateLogin for the authenticated account-linking flow;
// userID is carried in the signed flow state so Callback knows which account
// to link the identity to.
func (s *OIDCSvc) InitiateLink(providerName string, userID int64) (redirectURL, flowToken string, err error) {
	return s.initiate(providerName, oidcPurposeLink, userID)
}

// OIDCCallbackResult is returned by Callback on success.
type OIDCCallbackResult struct {
	Purpose               string // oidcPurposeLogin or oidcPurposeLink
	AccessToken           string
	RefreshToken          string
	RefreshTokenExpiresAt time.Time
}

// Callback validates the flow-state cookie against the callback parameters,
// exchanges the code, verifies the ID token, and either logs the user in
// (creating or linking an account per the priority in findOrCreateForLogin)
// or completes an authenticated link flow. Every failure returns one of the
// generic sentinel errors in oidc_types.go — never a provider-specific cause.
func (s *OIDCSvc) Callback(ctx context.Context, providerName, code, stateParam, flowCookieRaw string) (OIDCCallbackResult, error) {
	st, err := decodeFlowState(flowCookieRaw, s.stateSecret)
	if err != nil {
		return OIDCCallbackResult{}, err
	}
	if st.Provider != providerName || st.State != stateParam {
		return OIDCCallbackResult{}, ErrInvalidState
	}

	identity, err := s.exchangeAndVerify(ctx, providerName, code, st.Verifier, st.Nonce)
	if err != nil {
		return OIDCCallbackResult{}, err
	}
	identity.Provider = providerName

	return s.completeCallback(ctx, st, *identity)
}

// ListIdentities returns every provider linked to userID.
func (s *OIDCSvc) ListIdentities(ctx context.Context, userID int64) ([]UserIdentity, error) {
	identities, err := s.repo.ListIdentities(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list identities: %w", err)
	}
	return identities, nil
}

// Unlink removes a linked identity. It blocks removing a user's only
// remaining sign-in method (no password and no other linked identity) to
// prevent lockout, and is otherwise idempotent.
func (s *OIDCSvc) Unlink(ctx context.Context, userID int64, providerName string) error {
	if _, err := s.registry.Provider(providerName); err != nil {
		return ErrUnknownProvider
	}

	count, hasPassword, err := s.repo.CountIdentitiesAndHash(ctx, userID)
	if err != nil {
		return fmt.Errorf("count identities and hash: %w", err)
	}
	if !hasPassword && count <= 1 {
		return ErrLastCredential
	}

	if err := s.repo.UnlinkIdentity(ctx, userID, providerName); err != nil {
		return fmt.Errorf("unlink identity: %w", err)
	}
	return nil
}

func (s *OIDCSvc) completeCallback(ctx context.Context, st flowState, identity oidc.Identity) (OIDCCallbackResult, error) {
	if st.Purpose == oidcPurposeLink {
		if err := s.linkToUser(ctx, st.UserID, identity); err != nil {
			return OIDCCallbackResult{}, err
		}
		return OIDCCallbackResult{Purpose: oidcPurposeLink}, nil
	}

	user, err := s.findOrCreateForLogin(ctx, identity)
	if err != nil {
		return OIDCCallbackResult{}, err
	}
	return s.issueTokens(ctx, user)
}

func (s *OIDCSvc) initiate(providerName, purpose string, userID int64) (redirectURL, flowToken string, err error) {
	p, err := s.registry.Provider(providerName)
	if err != nil {
		return "", "", ErrUnknownProvider
	}

	state, err := generateState()
	if err != nil {
		return "", "", err
	}
	nonce, err := generateNonce()
	if err != nil {
		return "", "", err
	}
	verifier, err := generatePKCEVerifier()
	if err != nil {
		return "", "", err
	}

	redirectURL, err = p.AuthURL(state, nonce, pkceChallengeS256(verifier))
	if err != nil {
		return "", "", fmt.Errorf("build auth url: %w", err)
	}

	flowToken, err = signFlowState(flowState{
		State:     state,
		Nonce:     nonce,
		Verifier:  verifier,
		Provider:  providerName,
		Purpose:   purpose,
		UserID:    userID,
		ExpiresAt: time.Now().Add(oidcFlowStateTTL).Unix(),
	}, s.stateSecret)
	if err != nil {
		return "", "", fmt.Errorf("sign flow state: %w", err)
	}

	return redirectURL, flowToken, nil
}

// exchangeAndVerify resolves the provider, exchanges the authorization code,
// and verifies the resulting ID token. Every failure collapses to
// ErrTokenExchangeFailed — the callback never reveals which check failed.
func (s *OIDCSvc) exchangeAndVerify(ctx context.Context, providerName, code, verifier, nonce string) (*oidc.Identity, error) {
	p, err := s.registry.Provider(providerName)
	if err != nil {
		return nil, ErrUnknownProvider
	}

	ts, err := p.Exchange(ctx, code, verifier)
	if err != nil {
		s.log.Debug("oidc callback: code exchange failed", zap.String("provider", providerName), zap.Error(err))
		return nil, ErrTokenExchangeFailed
	}

	identity, err := p.VerifyIDToken(ctx, ts, nonce)
	if err != nil {
		s.log.Debug("oidc callback: id token verification failed", zap.String("provider", providerName), zap.Error(err))
		return nil, ErrTokenExchangeFailed
	}
	return identity, nil
}

func (s *OIDCSvc) issueTokens(ctx context.Context, user models.User) (OIDCCallbackResult, error) {
	accessToken, _, err := GenerateAccessToken(user.ID, s.authSvc.jwtSecret, s.authSvc.accessTokenTTL)
	if err != nil {
		return OIDCCallbackResult{}, err
	}

	refreshIssue, err := s.authSvc.IssueRefreshToken(ctx, user.ID)
	if err != nil {
		return OIDCCallbackResult{}, err
	}

	if err := s.authSvc.repo.UpdateLastLogin(ctx, user.ID); err != nil {
		return OIDCCallbackResult{}, fmt.Errorf("update last login: %w", err)
	}

	return OIDCCallbackResult{
		Purpose:               oidcPurposeLogin,
		AccessToken:           accessToken,
		RefreshToken:          refreshIssue.RawToken,
		RefreshTokenExpiresAt: refreshIssue.ExpiresAt,
	}, nil
}

// findOrCreateForLogin implements the linking priority from the OIDC spec:
//  1. an existing identity for (provider, subject) always wins;
//  2. otherwise, a verified email that matches an existing account auto-links
//     to it (promoting a dormant pending_verification account to active);
//  3. otherwise a brand-new account is created.
//
// An unverified provider email is rejected outright — there is no pending/
// partial path for OIDC signups, since Moniqo has no channel to verify an
// email the identity provider itself won't vouch for.
func (s *OIDCSvc) findOrCreateForLogin(ctx context.Context, identity oidc.Identity) (models.User, error) {
	existing, err := s.repo.GetIdentityByProviderSubject(ctx, identity.Provider, identity.Subject)
	switch {
	case err == nil:
		user, err := s.authSvc.repo.GetUserByID(ctx, existing.UserID)
		if err != nil {
			return models.User{}, fmt.Errorf("get user by id: %w", err)
		}
		return user, nil
	case !errors.Is(err, ErrIdentityNotFound):
		return models.User{}, fmt.Errorf("get identity by provider subject: %w", err)
	}

	if !identity.EmailVerified {
		return models.User{}, ErrIdentityNotVerified
	}

	return s.linkOrCreateByEmail(ctx, identity)
}

func (s *OIDCSvc) linkOrCreateByEmail(ctx context.Context, identity oidc.Identity) (models.User, error) {
	linkable, err := s.repo.GetUserByEmailForLinking(ctx, identity.Email)
	switch {
	case err == nil:
		return s.linkExistingAndActivate(ctx, linkable, identity)
	case errors.Is(err, ErrUserNotFound):
		return s.createUserForIdentity(ctx, identity)
	default:
		return models.User{}, fmt.Errorf("get user by email for linking: %w", err)
	}
}

// linkExistingAndActivate links identity to an already-existing account
// found by verified email, promoting a dormant pending_verification account
// to active in the process (the provider's verification is itself proof of
// email ownership).
func (s *OIDCSvc) linkExistingAndActivate(ctx context.Context, linkable LinkableUser, identity oidc.Identity) (models.User, error) {
	if err := s.repo.LinkIdentity(ctx, linkable.ID, identity.Provider, identity.Subject, identity.Email); err != nil {
		return models.User{}, fmt.Errorf("link identity: %w", err)
	}
	if linkable.Status == models.UserStatusPendingVerification {
		if err := s.repo.ActivateUser(ctx, linkable.ID); err != nil {
			return models.User{}, fmt.Errorf("activate user: %w", err)
		}
	}
	user, err := s.authSvc.repo.GetUserByID(ctx, linkable.ID)
	if err != nil {
		return models.User{}, fmt.Errorf("get user by id: %w", err)
	}
	return user, nil
}

func (s *OIDCSvc) createUserForIdentity(ctx context.Context, identity oidc.Identity) (models.User, error) {
	var namePtr *string
	if identity.Name != "" {
		name := identity.Name
		namePtr = &name
	}
	user, err := s.repo.CreateUserFromIdentity(ctx, CreateOIDCUserParams{
		Username:        deriveUsername(identity.Email, identity.Name),
		Email:           identity.Email,
		Name:            namePtr,
		Picture:         identity.Picture,
		Provider:        identity.Provider,
		ProviderSubject: identity.Subject,
		ProviderEmail:   identity.Email,
	})
	if err != nil {
		return models.User{}, fmt.Errorf("create user from identity: %w", err)
	}
	return user, nil
}

// linkToUser implements the authenticated-link decision tree: never transfer
// an identity already linked to someone else, never merge accounts just
// because emails match.
func (s *OIDCSvc) linkToUser(ctx context.Context, userID int64, identity oidc.Identity) error {
	if !identity.EmailVerified {
		return ErrIdentityNotVerified
	}

	isNewLink, err := s.identityLinkStatus(ctx, userID, identity)
	if err != nil {
		return err
	}
	if !isNewLink {
		return nil // idempotent re-link to the same user
	}

	if err := s.checkEmailNotOwnedByOther(ctx, userID, identity.Email); err != nil {
		return err
	}

	if err := s.repo.LinkIdentity(ctx, userID, identity.Provider, identity.Subject, identity.Email); err != nil {
		return fmt.Errorf("link identity: %w", err)
	}
	return nil
}

// identityLinkStatus reports whether (provider, subject) is not yet linked
// to anyone (isNewLink=true) versus already linked to userID
// (isNewLink=false, nil error — a no-op) versus linked to a different user
// (ErrIdentityAlreadyLinked — identities are never transferred).
func (s *OIDCSvc) identityLinkStatus(ctx context.Context, userID int64, identity oidc.Identity) (isNewLink bool, err error) {
	existing, err := s.repo.GetIdentityByProviderSubject(ctx, identity.Provider, identity.Subject)
	if err == nil {
		if existing.UserID == userID {
			return false, nil
		}
		return false, ErrIdentityAlreadyLinked
	}
	if !errors.Is(err, ErrIdentityNotFound) {
		return false, fmt.Errorf("get identity by provider subject: %w", err)
	}
	return true, nil
}

// checkEmailNotOwnedByOther rejects linking when the identity's verified
// email belongs to a different existing Moniqo account — accounts are never
// silently merged just because their emails match.
func (s *OIDCSvc) checkEmailNotOwnedByOther(ctx context.Context, userID int64, email string) error {
	linkable, err := s.repo.GetUserByEmailForLinking(ctx, email)
	switch {
	case err == nil && linkable.ID != userID:
		return ErrEmailAlreadyExists
	case err != nil && !errors.Is(err, ErrUserNotFound):
		return fmt.Errorf("get user by email for linking: %w", err)
	}
	return nil
}

// deriveUsername builds a best-effort username from the identity's name or
// email local-part, sanitized to letters/digits, starting with a letter, and
// clamped to the existing username length constraints (8-12 chars). Callers
// retry with a numeric suffix on collision (see OIDCRepo.CreateUserFromIdentity).
func deriveUsername(email, name string) string {
	base := name
	if base == "" {
		base = email
	}
	if at := strings.IndexByte(base, '@'); at > 0 {
		base = base[:at]
	}
	base = sanitizeToAlnum(base)

	if base == "" || !isASCIILetter(base[0]) {
		base = "u" + base
	}
	if len(base) > maxDerivedUsernameLen {
		base = base[:maxDerivedUsernameLen]
	}
	for len(base) < minDerivedUsernameLen {
		base += "0"
	}
	return base
}

func sanitizeToAlnum(s string) string {
	var b strings.Builder
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			_, _ = b.WriteRune(r)
		}
	}
	return b.String()
}

func isASCIILetter(b byte) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z')
}
