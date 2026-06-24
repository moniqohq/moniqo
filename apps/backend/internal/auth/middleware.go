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
	"errors"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	echomw "github.com/labstack/echo/v4/middleware"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// unauthorizedMsg is the generic rejection message used for every auth failure.
// It never reveals which check failed (expired, revoked, deleted, ...).
const unauthorizedMsg = "unauthorized"

// ClaimsFromContext retrieves the verified JWT claims attached by Middleware.
func ClaimsFromContext(c echo.Context) (*Claims, bool) {
	v := c.Get(string(claimsKey))
	claims, ok := v.(*Claims)
	return claims, ok
}

// UserFromContext retrieves the resolved user attached by Middleware.
func UserFromContext(c echo.Context) (*models.User, bool) {
	v := c.Get(string(ContextKeyUser))
	u, ok := v.(*models.User)
	return u, ok
}

// setClaimsInContext stores verified claims under the well-known context key.
func setClaimsInContext(c echo.Context, claims *Claims) {
	c.Set(string(claimsKey), claims)
}

// setUserInContext stores the resolved user under ContextKeyUser.
func setUserInContext(c echo.Context, u *models.User) {
	c.Set(string(ContextKeyUser), u)
}

// Middleware returns an Echo middleware that enforces JWT authentication.
// The skipper (if non-nil) is consulted first; when it returns true the request
// bypasses authentication entirely. Per issue #21 it runs these checks in order:
//  1. Extract and validate the Bearer token.
//  2. Parse and verify JWT signature + exp.
//  3. Reject if the jti appears in revoked_access_tokens.
//  4. Resolve the user (sub); reject if missing or soft-deleted.
//
// On success it injects the resolved *models.User under ContextKeyUser and the
// verified Claims under claimsKey.
func Middleware(repo Repository, jwtSecret []byte, log *zap.Logger, skipper echomw.Skipper) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if skipper != nil && skipper(c) {
				return next(c)
			}
			return authenticate(c, next, repo, jwtSecret, log)
		}
	}
}

func authenticate(c echo.Context, next echo.HandlerFunc, repo Repository, jwtSecret []byte, log *zap.Logger) error {
	tokenString, err := extractBearerToken(c)
	if err != nil {
		return httpx.Unauthorized(c, unauthorizedMsg)
	}

	claims, err := ParseAccessToken(tokenString, jwtSecret)
	if err != nil {
		log.Debug("middleware: token parse/validation failed", zap.Error(err))
		return httpx.Unauthorized(c, unauthorizedMsg)
	}

	if err := checkRevocation(c, repo, claims.ID, log); err != nil {
		return err
	}

	user, err := resolveUser(c, repo, claims.Subject, log)
	if err != nil {
		return err
	}

	if user.TokensInvalidBefore != nil && claims.IssuedAt != nil &&
		claims.IssuedAt.Time.Before(*user.TokensInvalidBefore) {
		log.Debug("middleware: access token predates password reset epoch",
			zap.Int64("user_id", user.ID))
		_ = httpx.Unauthorized(c, unauthorizedMsg)
		return echo.ErrUnauthorized
	}

	setClaimsInContext(c, claims)
	setUserInContext(c, user)
	return next(c)
}

func checkRevocation(c echo.Context, repo Repository, jtiStr string, log *zap.Logger) error {
	jti, err := uuid.Parse(jtiStr)
	if err != nil {
		log.Error("middleware: malformed jti claim", zap.String("jti", jtiStr))
		_ = httpx.Unauthorized(c, unauthorizedMsg)
		return echo.ErrUnauthorized
	}

	revoked, err := repo.IsAccessTokenRevoked(c.Request().Context(), pgtype.UUID{Bytes: jti, Valid: true})
	if err != nil {
		log.Error("middleware: revocation check failed", zap.Error(err))
		_ = httpx.InternalError(c)
		return echo.ErrInternalServerError
	}
	if revoked {
		_ = httpx.Unauthorized(c, unauthorizedMsg)
		return echo.ErrUnauthorized
	}
	return nil
}

func resolveUser(c echo.Context, repo Repository, sub string, log *zap.Logger) (*models.User, error) {
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		log.Error("middleware: malformed sub claim", zap.String("sub", sub))
		_ = httpx.Unauthorized(c, unauthorizedMsg)
		return nil, echo.ErrUnauthorized
	}

	user, err := repo.GetUserByID(c.Request().Context(), userID)
	if errors.Is(err, ErrUserNotFound) {
		_ = httpx.Unauthorized(c, unauthorizedMsg)
		return nil, echo.ErrUnauthorized
	}
	if err != nil {
		log.Error("middleware: user resolution failed", zap.Error(err))
		_ = httpx.InternalError(c)
		return nil, echo.ErrInternalServerError
	}
	return &user, nil
}

func extractBearerToken(c echo.Context) (string, error) {
	header := c.Request().Header.Get(echo.HeaderAuthorization)
	if !strings.HasPrefix(header, "Bearer ") {
		return "", errors.New("missing or malformed authorization header")
	}
	return strings.TrimPrefix(header, "Bearer "), nil
}
