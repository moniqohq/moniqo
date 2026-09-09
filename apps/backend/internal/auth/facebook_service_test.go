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
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth/oidc"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

func TestOIDCSvc_LoginWithFacebookToken(t *testing.T) {
	t.Parallel()

	t.Run("unconfigured facebook returns ErrUnknownProvider", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{})

		_, err := svc.LoginWithFacebookToken(context.Background(), "some-token", "login")
		assert.ErrorIs(t, err, auth.ErrUnknownProvider)
	})

	t.Run("verifier failure collapses to ErrTokenExchangeFailed", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		fb := &internalmock.TokenVerifier{
			NameFn: func() string { return "facebook" },
			VerifyAccessTokenFn: func(_ context.Context, _ string) (*oidc.Identity, error) {
				return nil, errors.New("graph api rejected the token")
			},
		}
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{}, fb)

		_, err := svc.LoginWithFacebookToken(context.Background(), "some-token", "login")
		assert.ErrorIs(t, err, auth.ErrTokenExchangeFailed)
	})

	t.Run("unverified email is rejected for a new identity", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		fb := stubFacebookVerifier(oidc.Identity{Subject: "fb-1", Email: "user@example.com", EmailVerified: false})

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "facebook", "fb-1").Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{}, fb)

		_, err := svc.LoginWithFacebookToken(context.Background(), "some-token", "login")
		assert.ErrorIs(t, err, auth.ErrIdentityNotVerified)
	})

	t.Run("login intent never creates an account", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		fb := stubFacebookVerifier(oidc.Identity{Subject: "fb-2", Email: "new@example.com", EmailVerified: true})

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "facebook", "fb-2").Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "new@example.com").Return(auth.LinkableUser{}, auth.ErrUserNotFound)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{}, fb)

		_, err := svc.LoginWithFacebookToken(context.Background(), "some-token", "login")
		assert.ErrorIs(t, err, auth.ErrAccountNotFound)
		oidcRepo.AssertNotCalled(t, "CreateUserFromIdentity", mock.Anything)
	})

	t.Run("signup intent creates an account for a new verified identity", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		fb := stubFacebookVerifier(oidc.Identity{Subject: "fb-3", Email: "new@example.com", EmailVerified: true, Name: "New User"})

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "facebook", "fb-3").Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "new@example.com").Return(auth.LinkableUser{}, auth.ErrUserNotFound)
		oidcRepo.On("CreateUserFromIdentity", mock.Anything).Return(models.User{ID: 9}, nil)

		authRepo := &internalmock.AuthRepository{}
		authRepo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		authRepo.On("UpdateLastLogin", int64(9)).Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, authRepo, fb)

		result, err := svc.LoginWithFacebookToken(context.Background(), "some-token", "signup")
		require.NoError(t, err)
		assert.NotEmpty(t, result.AccessToken)
	})

	t.Run("existing identity logs in without touching email lookup", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		fb := stubFacebookVerifier(oidc.Identity{Subject: "fb-4", Email: "user@example.com", EmailVerified: true})

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "facebook", "fb-4").Return(auth.UserIdentity{UserID: 3}, nil)

		authRepo := &internalmock.AuthRepository{}
		authRepo.On("GetUserByID", int64(3)).Return(models.User{ID: 3}, nil)
		authRepo.On("InsertRefreshToken", mock.Anything).Return([16]byte{}, nil)
		authRepo.On("UpdateLastLogin", int64(3)).Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, authRepo, fb)

		result, err := svc.LoginWithFacebookToken(context.Background(), "some-token", "login")
		require.NoError(t, err)
		assert.NotEmpty(t, result.AccessToken)
		oidcRepo.AssertNotCalled(t, "GetUserByEmailForLinking", mock.Anything)
	})
}

func TestOIDCSvc_LinkFacebookToken(t *testing.T) {
	t.Parallel()

	t.Run("unconfigured facebook returns ErrUnknownProvider", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{})

		err := svc.LinkFacebookToken(context.Background(), 1, "some-token")
		assert.ErrorIs(t, err, auth.ErrUnknownProvider)
	})

	t.Run("unverified email is rejected", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		fb := stubFacebookVerifier(oidc.Identity{Subject: "fb-5", Email: "user@example.com", EmailVerified: false})
		svc := newTestOIDCSvc(t, &internalmock.OIDCRepository{}, registry, &internalmock.AuthRepository{}, fb)

		err := svc.LinkFacebookToken(context.Background(), 1, "some-token")
		assert.ErrorIs(t, err, auth.ErrIdentityNotVerified)
	})

	t.Run("links a new identity to the authenticated user", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		fb := stubFacebookVerifier(oidc.Identity{Subject: "fb-6", Email: "user@example.com", EmailVerified: true})

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "facebook", "fb-6").Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "user@example.com").Return(auth.LinkableUser{}, auth.ErrUserNotFound)
		oidcRepo.On("LinkIdentity", int64(1), "facebook", "fb-6", "user@example.com").Return(nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{}, fb)

		err := svc.LinkFacebookToken(context.Background(), 1, "some-token")
		require.NoError(t, err)
	})

	t.Run("never merges into a different existing account", func(t *testing.T) {
		t.Parallel()
		registry := stubRegistry("google", nil)
		fb := stubFacebookVerifier(oidc.Identity{Subject: "fb-7", Email: "other@example.com", EmailVerified: true})

		oidcRepo := &internalmock.OIDCRepository{}
		oidcRepo.On("GetIdentityByProviderSubject", "facebook", "fb-7").Return(auth.UserIdentity{}, auth.ErrIdentityNotFound)
		oidcRepo.On("GetUserByEmailForLinking", "other@example.com").Return(auth.LinkableUser{ID: 99}, nil)

		svc := newTestOIDCSvc(t, oidcRepo, registry, &internalmock.AuthRepository{}, fb)

		err := svc.LinkFacebookToken(context.Background(), 1, "some-token")
		assert.ErrorIs(t, err, auth.ErrEmailAlreadyExists)
		oidcRepo.AssertNotCalled(t, "LinkIdentity", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	})
}
