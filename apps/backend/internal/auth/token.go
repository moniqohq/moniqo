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
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const (
	issuer               = "moniqo"
	refreshTokenSize     = 32
	passwordResetRawSize = 32 // 32 bytes → 64-char hex string
)

// contextKey is a private type to prevent collisions with other packages.
type contextKey string

const claimsKey contextKey = "auth_claims"

// ContextKeyUser is the context key under which Middleware stores the resolved
// *models.User for downstream handlers.
const ContextKeyUser contextKey = "authenticated_user"

// Claims is the JWT payload for Moniqo access tokens.
type Claims struct {
	jwt.RegisteredClaims
}

// GenerateAccessToken mints a signed JWT for the given user ID and returns
// the token string alongside the full claims (which carry the jti).
func GenerateAccessToken(userID int64, secret []byte, ttl time.Duration) (string, *Claims, error) {
	now := time.Now()
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(secret)
	if err != nil {
		return "", nil, fmt.Errorf("sign token: %w", err)
	}
	return signed, claims, nil
}

// GenerateRefreshToken produces a cryptographically random 32-byte token,
// returning both the raw base64url value (sent to the client) and its SHA-256
// hex hash (stored in the DB — the raw value is never persisted).
func GenerateRefreshToken() (raw string, hash string, err error) {
	buf := make([]byte, refreshTokenSize)
	if _, err = rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("generate random bytes: %w", err)
	}
	raw = base64.RawURLEncoding.EncodeToString(buf)
	hash = HashRefreshToken(raw)
	return raw, hash, nil
}

// HashRefreshToken returns the SHA-256 hex digest of a raw refresh token.
// Used for both storing and looking up tokens without persisting the raw value.
func HashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}

// GeneratePasswordResetToken produces a cryptographically random 32-byte token,
// returning the raw hex string (sent to the client) and its SHA-256 hex hash
// (stored in the DB). The raw value is never persisted.
func GeneratePasswordResetToken() (raw string, hash string, err error) {
	buf := make([]byte, passwordResetRawSize)
	if _, err = rand.Read(buf); err != nil {
		return "", "", fmt.Errorf("generate random bytes: %w", err)
	}
	raw = hex.EncodeToString(buf)
	hash = HashRefreshToken(raw) // SHA-256 hex of the raw token
	return raw, hash, nil
}

// ParseAccessToken validates a JWT string and returns the embedded claims.
func ParseAccessToken(tokenString string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&Claims{},
		func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return secret, nil
		},
		jwt.WithIssuer(issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, fmt.Errorf("parse token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, errors.New("invalid claims type")
	}
	return claims, nil
}
