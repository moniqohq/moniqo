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

package auth_test

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

func newTestOIDCSvc(t *testing.T, oidcRepo auth.OIDCRepository, registry oidc.ProviderRegistry, authRepo auth.Repository) *auth.OIDCSvc {
	t.Helper()
	log := zap.NewNop()
	authSvc := auth.NewSvc(authRepo, testSecret, 15*time.Minute, 168*time.Hour, 720*time.Hour, log)
	return auth.NewOIDCSvc(oidcRepo, registry, authSvc, []byte("oidc-state-secret"), log)
}

func stubRegistry(name string, p oidc.IdentityProvider) *internalmock.ProviderRegistry {
	return &internalmock.ProviderRegistry{
		ProviderFn: func(n string) (oidc.IdentityProvider, error) {
			if n != name {
				return nil, oidc.ErrUnknownProvider
			}
			return p, nil
		},
	}
}

func stubGoogleProvider(identity oidc.Identity) *internalmock.IdentityProvider {
	return &internalmock.IdentityProvider{
		NameFn: func() string { return "google" },
		AuthURLFn: func(state, nonce, codeChallenge string) (string, error) {
			return "https://accounts.google.com/o/oauth2/auth?state=" + state, nil
		},
		ExchangeFn: func(_ context.Context, code, verifier string) (*oidc.TokenSet, error) {
			return &oidc.TokenSet{IDToken: "fake-id-token"}, nil
		},
		VerifyIDTokenFn: func(_ context.Context, _ *oidc.TokenSet, _ string) (*oidc.Identity, error) {
			id := identity
			return &id, nil
		},
	}
}

func signedLoginCookie(t *testing.T, state string) string {
	t.Helper()
	token, err := auth.SignFlowStateForTest([]byte("oidc-state-secret"), auth.FlowStateFields{
		State:    state,
		Nonce:    "nonce",
		Verifier: "verifier",
		Provider: "google",
		Purpose:  auth.OIDCPurposeLogin,
	}, auth.OIDCFlowStateTTL)
	require.NoError(t, err)
	return token
}

func signedLinkCookie(t *testing.T, state string, userID int64) string {
	t.Helper()
	token, err := auth.SignFlowStateForTest([]byte("oidc-state-secret"), auth.FlowStateFields{
		State:    state,
		Nonce:    "nonce",
		Verifier: "verifier",
		Provider: "google",
		Purpose:  auth.OIDCPurposeLink,
		UserID:   userID,
	}, auth.OIDCFlowStateTTL)
	require.NoError(t, err)
	return token
}

func TestOIDCSvc_InitiateLogin(t *testing.T) {
	t.Parallel()

	t.Run("unknown provider", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{})

		_, _, err := svc.InitiateLogin("facebook")
		assert.ErrorIs(t, err, auth.ErrUnknownProvider)
	})

	t.Run("success returns a redirect URL and a signed flow token", func(t *testing.T) {
		t.Parallel()
		p := stubGoogleProvider(oidc.Identity{})
		registry := stubRegistry("google", p)
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{})

		redirectURL, flowToken, err := svc.InitiateLogin("google")
		require.NoError(t, err)
		assert.Contains(t, redirectURL, "accounts.google.com")
		assert.NotEmpty(t, flowToken)

		decoded, err := auth.DecodeFlowStateForTest(flowToken, []byte("oidc-state-secret"))
		require.NoError(t, err)
		assert.Equal(t, "google", decoded.Provider)
		assert.Equal(t, auth.OIDCPurposeLogin, decoded.Purpose)
	})
}

func TestOIDCSvc_Callback_Login(t *testing.T) {
	t.Parallel()

	t.Run("invalid state cookie", func(t *testing.T) {
		t.Parallel()
		p := stubGoogleProvider(oidc.Identity{})
		registry := stubRegistry("google", p)
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{})

		_, err := svc.Callback(context.Background(), "google", "code", "state", "garbage-cookie")
		assert.ErrorIs(t, err, auth.ErrInvalidState)
	})

	t.Run("state parameter mismatch", func(t *testing.T) {
		t.Parallel()
		p := stubGoogleProvider(oidc.Identity{})
		registry := stubRegistry("google", p)
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{})

		cookie := signedLoginCookie(t, "expected-state")
		_, err := svc.Callback(context.Background(), "google", "code", "different-state", cookie)
		assert.ErrorIs(t, err, auth.ErrInvalidState)
	})

	t.Run("existing identity logs in without touching email lookup", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-1", Email: "user@example.com", EmailVerified: true}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-1").
			Return(auth.UserIdentity{UserID: 7}, nil)

		authRepo := &internalmock.AuthRepository{}
		authRepo.On("GetUserByID", int64(7)).Return(models.User{ID: 7}, nil)
		authRepo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		authRepo.On("UpdateLastLogin", int64(7)).Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, authRepo)
		cookie := signedLoginCookie(t, "state1")

		result, err := svc.Callback(context.Background(), "google", "code", "state1", cookie)
		require.NoError(t, err)
		assert.NotEmpty(t, result.AccessToken)
		oidcRepo.AssertNotCalled(t, "GetUserByEmailForLinking", mock.Anything)
		oidcRepo.AssertNotCalled(t, "CreateUserFromIdentity", mock.Anything)
	})

	t.Run("unverified email is rejected for a new identity", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-2", Email: "user@example.com", EmailVerified: false}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-2").
			Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		cookie := signedLoginCookie(t, "state2")

		_, err := svc.Callback(context.Background(), "google", "code", "state2", cookie)
		assert.ErrorIs(t, err, auth.ErrIdentityNotVerified)
	})

	t.Run("verified email auto-links to existing active account", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-3", Email: "user@example.com", EmailVerified: true}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-3").
			Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "user@example.com").
			Return(auth.LinkableUser{ID: 9, Email: "user@example.com", Status: models.UserStatusActive}, nil)
		oidcRepo.On("LinkIdentity", int64(9), "google", "sub-3", "user@example.com").Return(nil)

		authRepo := &internalmock.AuthRepository{}
		authRepo.On("GetUserByID", int64(9)).Return(models.User{ID: 9}, nil)
		authRepo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		authRepo.On("UpdateLastLogin", int64(9)).Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, authRepo)
		cookie := signedLoginCookie(t, "state3")

		_, err := svc.Callback(context.Background(), "google", "code", "state3", cookie)
		require.NoError(t, err)
		oidcRepo.AssertNotCalled(t, "ActivateUser", mock.Anything)
	})

	t.Run("verified email auto-links and activates a dormant pending account", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-4", Email: "user@example.com", EmailVerified: true}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-4").
			Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "user@example.com").
			Return(auth.LinkableUser{ID: 11, Email: "user@example.com", Status: models.UserStatusPendingVerification}, nil)
		oidcRepo.On("LinkIdentity", int64(11), "google", "sub-4", "user@example.com").Return(nil)
		oidcRepo.On("ActivateUser", int64(11)).Return(nil)

		authRepo := &internalmock.AuthRepository{}
		authRepo.On("GetUserByID", int64(11)).Return(models.User{ID: 11}, nil)
		authRepo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		authRepo.On("UpdateLastLogin", int64(11)).Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, authRepo)
		cookie := signedLoginCookie(t, "state4")

		_, err := svc.Callback(context.Background(), "google", "code", "state4", cookie)
		require.NoError(t, err)
		oidcRepo.AssertCalled(t, "ActivateUser", int64(11))
	})

	t.Run("no existing identity or email creates a new user", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-5", Email: "newuser@example.com", EmailVerified: true, Name: "New User"}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-5").
			Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "newuser@example.com").
			Return(auth.LinkableUser{}, auth.ErrUserNotFound)
		oidcRepo.On("CreateUserFromIdentity", mock.Anything).
			Return(models.User{ID: 20, Email: "newuser@example.com"}, nil)

		authRepo := &internalmock.AuthRepository{}
		authRepo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		authRepo.On("UpdateLastLogin", int64(20)).Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, authRepo)
		cookie := signedLoginCookie(t, "state5")

		result, err := svc.Callback(context.Background(), "google", "code", "state5", cookie)
		require.NoError(t, err)
		assert.NotEmpty(t, result.AccessToken)
	})
}

func TestOIDCSvc_Callback_Link(t *testing.T) {
	t.Parallel()

	t.Run("idempotent re-link to the same user succeeds", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-6", Email: "user@example.com", EmailVerified: true}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-6").
			Return(auth.UserIdentity{UserID: 5}, nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		cookie := signedLinkCookie(t, "state6", 5)

		result, err := svc.Callback(context.Background(), "google", "code", "state6", cookie)
		require.NoError(t, err)
		assert.Equal(t, auth.OIDCPurposeLink, result.Purpose)
		oidcRepo.AssertNotCalled(t, "LinkIdentity", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("linking an identity already owned by someone else is rejected", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-7", Email: "user@example.com", EmailVerified: true}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-7").
			Return(auth.UserIdentity{UserID: 999}, nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		cookie := signedLinkCookie(t, "state7", 5)

		_, err := svc.Callback(context.Background(), "google", "code", "state7", cookie)
		assert.ErrorIs(t, err, auth.ErrIdentityAlreadyLinked)
	})

	t.Run("email already belonging to a different account is rejected", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-8", Email: "other@example.com", EmailVerified: true}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-8").
			Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "other@example.com").
			Return(auth.LinkableUser{ID: 42}, nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		cookie := signedLinkCookie(t, "state8", 5)

		_, err := svc.Callback(context.Background(), "google", "code", "state8", cookie)
		assert.ErrorIs(t, err, auth.ErrEmailAlreadyExists)
	})

	t.Run("clean new link succeeds", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-9", Email: "user@example.com", EmailVerified: true}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "google", "sub-9").
			Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "user@example.com").
			Return(auth.LinkableUser{}, auth.ErrUserNotFound)
		oidcRepo.On("LinkIdentity", int64(5), "google", "sub-9", "user@example.com").Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		cookie := signedLinkCookie(t, "state9", 5)

		result, err := svc.Callback(context.Background(), "google", "code", "state9", cookie)
		require.NoError(t, err)
		assert.Equal(t, auth.OIDCPurposeLink, result.Purpose)
	})

	t.Run("unverified email is rejected even for linking", func(t *testing.T) {
		t.Parallel()
		identity := oidc.Identity{Subject: "sub-10", Email: "user@example.com", EmailVerified: false}
		p := stubGoogleProvider(identity)
		registry := stubRegistry("google", p)

		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{})
		cookie := signedLinkCookie(t, "state10", 5)

		_, err := svc.Callback(context.Background(), "google", "code", "state10", cookie)
		assert.ErrorIs(t, err, auth.ErrIdentityNotVerified)
	})
}

func TestOIDCSvc_Unlink(t *testing.T) {
	t.Parallel()

	t.Run("unknown provider", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{})

		err := svc.Unlink(context.Background(), 1, "facebook")
		assert.ErrorIs(t, err, auth.ErrUnknownProvider)
	})

	t.Run("blocks removing the only sign-in method", func(t *testing.T) {
		t.Parallel()
		p := stubGoogleProvider(oidc.Identity{})
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("CountIdentitiesAndHash", int64(1)).Return(1, false, nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		err := svc.Unlink(context.Background(), 1, "google")
		assert.ErrorIs(t, err, auth.ErrLastCredential)
		oidcRepo.AssertNotCalled(t, "UnlinkIdentity", mock.Anything, mock.Anything)
	})

	t.Run("allows removing one of several identities", func(t *testing.T) {
		t.Parallel()
		p := stubGoogleProvider(oidc.Identity{})
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("CountIdentitiesAndHash", int64(1)).Return(2, false, nil)
		oidcRepo.On("UnlinkIdentity", int64(1), "google").Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		err := svc.Unlink(context.Background(), 1, "google")
		require.NoError(t, err)
	})

	t.Run("allows removing the only identity when a password exists", func(t *testing.T) {
		t.Parallel()
		p := stubGoogleProvider(oidc.Identity{})
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("CountIdentitiesAndHash", int64(1)).Return(1, true, nil)
		oidcRepo.On("UnlinkIdentity", int64(1), "google").Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		err := svc.Unlink(context.Background(), 1, "google")
		require.NoError(t, err)
	})

	t.Run("is idempotent", func(t *testing.T) {
		t.Parallel()
		p := stubGoogleProvider(oidc.Identity{})
		registry := stubRegistry("google", p)

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("CountIdentitiesAndHash", int64(1)).Return(0, true, nil)
		oidcRepo.On("UnlinkIdentity", int64(1), "google").Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{})
		err := svc.Unlink(context.Background(), 1, "google")
		require.NoError(t, err)
	})
}
