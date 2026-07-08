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

// Package mock provides testify-based test doubles for service and repository interfaces.
package mock

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/mock"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// AuthService is a test double for auth.AuthService.
type AuthService struct {
	LoginFn              func(ctx context.Context, req auth.LoginRequest) (auth.LoginResult, error)
	LogoutFn             func(ctx context.Context, params auth.LogoutParams) error
	RefreshAccessTokenFn func(ctx context.Context, rawToken string) (auth.RefreshResult, error)
}

// Login delegates to LoginFn.
func (m *AuthService) Login(ctx context.Context, req auth.LoginRequest) (auth.LoginResult, error) {
	return m.LoginFn(ctx, req)
}

// Logout delegates to LogoutFn.
func (m *AuthService) Logout(ctx context.Context, params auth.LogoutParams) error {
	return m.LogoutFn(ctx, params)
}

// RefreshAccessToken delegates to RefreshAccessTokenFn.
func (m *AuthService) RefreshAccessToken(ctx context.Context, rawToken string) (auth.RefreshResult, error) {
	return m.RefreshAccessTokenFn(ctx, rawToken)
}

// AuthRepository is a testify mock for auth.Repository.
type AuthRepository struct {
	mock.Mock
}

// GetUserByEmail records the call and returns the stubbed credentials.
func (m *AuthRepository) GetUserByEmail(_ context.Context, email string) (auth.UserCredentials, error) {
	args := m.Called(email)
	creds, ok := args.Get(0).(auth.UserCredentials)
	if !ok {
		return auth.UserCredentials{}, args.Error(1)
	}
	return creds, args.Error(1)
}

// UpdateLastLogin records the call and returns the stubbed error.
func (m *AuthRepository) UpdateLastLogin(_ context.Context, userID int64) error {
	args := m.Called(userID)
	return args.Error(0)
}

// LogoutTransaction is a mock implementation of AuthRepository.LogoutTransaction.
func (m *AuthRepository) LogoutTransaction(_ context.Context, p auth.LogoutParams) error {
	args := m.Called(p)
	return args.Error(0)
}

// IsAccessTokenRevoked is a mock implementation of AuthRepository.IsAccessTokenRevoked.
func (m *AuthRepository) IsAccessTokenRevoked(_ context.Context, jti pgtype.UUID) (bool, error) {
	args := m.Called(jti)
	return args.Bool(0), args.Error(1)
}

// GetUserByID is a mock implementation of AuthRepository.GetUserByID.
func (m *AuthRepository) GetUserByID(_ context.Context, userID int64) (models.User, error) {
	args := m.Called(userID)
	u, ok := args.Get(0).(models.User)
	if !ok {
		return models.User{}, args.Error(1)
	}
	return u, args.Error(1)
}

// InsertRefreshToken records the call and returns the stubbed token family ID.
func (m *AuthRepository) InsertRefreshToken(_ context.Context, p auth.InsertRefreshTokenRepoParams) ([16]byte, error) {
	args := m.Called(p)
	familyID, ok := args.Get(0).([16]byte)
	if !ok {
		return [16]byte{}, args.Error(1)
	}
	return familyID, args.Error(1)
}

// GetRefreshTokenByHash records the call and returns the stubbed refresh token.
func (m *AuthRepository) GetRefreshTokenByHash(_ context.Context, hash string) (db.RefreshToken, error) {
	args := m.Called(hash)
	token, ok := args.Get(0).(db.RefreshToken)
	if !ok {
		return db.RefreshToken{}, args.Error(1)
	}
	return token, args.Error(1)
}

// MarkRefreshTokenUsed records the call and returns the stubbed error.
func (m *AuthRepository) MarkRefreshTokenUsed(_ context.Context, id [16]byte) error {
	args := m.Called(id)
	return args.Error(0)
}

// RevokeRefreshTokenFamily records the call and returns the stubbed error.
func (m *AuthRepository) RevokeRefreshTokenFamily(_ context.Context, familyID [16]byte, reason string) error {
	args := m.Called(familyID, reason)
	return args.Error(0)
}

// RotateRefreshToken records the call and returns the stubbed new token family ID.
func (m *AuthRepository) RotateRefreshToken(_ context.Context, oldID [16]byte, p auth.InsertRefreshTokenRepoParams) ([16]byte, error) {
	args := m.Called(oldID, p)
	familyID, ok := args.Get(0).([16]byte)
	if !ok {
		return [16]byte{}, args.Error(1)
	}
	return familyID, args.Error(1)
}

// PasswordResetRepository is a testify mock for auth.PasswordResetRepository.
type PasswordResetRepository struct {
	mock.Mock
}

// GetUserForPasswordReset records the call and returns the stubbed user info.
func (m *PasswordResetRepository) GetUserForPasswordReset(_ context.Context, emailAddr string) (auth.PasswordResetUserInfo, error) {
	args := m.Called(emailAddr)
	u, ok := args.Get(0).(auth.PasswordResetUserInfo)
	if !ok {
		return auth.PasswordResetUserInfo{}, args.Error(1)
	}
	return u, args.Error(1)
}

// InvalidateUserPasswordResetTokens records the call and returns the stubbed error.
func (m *PasswordResetRepository) InvalidateUserPasswordResetTokens(_ context.Context, userID int64) error {
	args := m.Called(userID)
	return args.Error(0)
}

// InsertPasswordResetToken records the call and returns the stubbed error.
func (m *PasswordResetRepository) InsertPasswordResetToken(_ context.Context, userID int64, tokenHash string, expiresAt time.Time) error {
	args := m.Called(userID, tokenHash, expiresAt)
	return args.Error(0)
}

// GetPasswordResetTokenByHash records the call and returns the stubbed token row.
func (m *PasswordResetRepository) GetPasswordResetTokenByHash(_ context.Context, tokenHash string) (auth.PasswordResetTokenRow, error) {
	args := m.Called(tokenHash)
	row, ok := args.Get(0).(auth.PasswordResetTokenRow)
	if !ok {
		return auth.PasswordResetTokenRow{}, args.Error(1)
	}
	return row, args.Error(1)
}

// ConfirmResetTransaction records the call and returns the stubbed error.
func (m *PasswordResetRepository) ConfirmResetTransaction(_ context.Context, p auth.ConfirmResetTxParams) error {
	args := m.Called(p)
	return args.Error(0)
}
