package auth

import (
	"errors"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// ClaimsFromContext retrieves the verified JWT claims attached by Middleware.
func ClaimsFromContext(c echo.Context) (*Claims, bool) {
	v := c.Get(string(claimsKey))
	claims, ok := v.(*Claims)
	return claims, ok
}

// setClaimsInContext stores verified claims under the well-known context key.
func setClaimsInContext(c echo.Context, claims *Claims) {
	c.Set(string(claimsKey), claims)
}

// Middleware returns an Echo middleware that enforces JWT authentication.
// Per issue #20 it runs the following checks in order:
//  1. Parse and verify JWT signature + exp.
//  2. Reject if the jti appears in revoked_access_tokens.
//  3. Reject if the user (sub) no longer exists (soft-deleted).
//  4. Attach the verified Claims to the Echo context.
func Middleware(repo Repository, jwtSecret []byte, log *zap.Logger) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			return authenticate(c, next, repo, jwtSecret, log)
		}
	}
}

func authenticate(c echo.Context, next echo.HandlerFunc, repo Repository, jwtSecret []byte, log *zap.Logger) error {
	tokenString, err := extractBearerToken(c)
	if err != nil {
		return httpx.Unauthorized(c, "not authenticated")
	}

	claims, err := ParseAccessToken(tokenString, jwtSecret)
	if err != nil {
		log.Debug("middleware: token parse/validation failed", zap.Error(err))
		return httpx.Unauthorized(c, "not authenticated")
	}

	if err := checkRevocation(c, repo, claims.ID, log); err != nil {
		return err
	}

	if err := checkUserExists(c, repo, claims.Subject, log); err != nil {
		return err
	}

	setClaimsInContext(c, claims)
	return next(c)
}

func checkRevocation(c echo.Context, repo Repository, jtiStr string, log *zap.Logger) error {
	jti, err := uuid.Parse(jtiStr)
	if err != nil {
		log.Error("middleware: malformed jti claim", zap.String("jti", jtiStr))
		return httpx.Unauthorized(c, "not authenticated")
	}

	revoked, err := repo.IsAccessTokenRevoked(c.Request().Context(), pgtype.UUID{Bytes: jti, Valid: true})
	if err != nil {
		log.Error("middleware: revocation check failed", zap.Error(err))
		return httpx.InternalError(c)
	}
	if revoked {
		return httpx.Unauthorized(c, "not authenticated")
	}
	return nil
}

func checkUserExists(c echo.Context, repo Repository, sub string, log *zap.Logger) error {
	userID, err := strconv.ParseInt(sub, 10, 64)
	if err != nil {
		log.Error("middleware: malformed sub claim", zap.String("sub", sub))
		return httpx.Unauthorized(c, "not authenticated")
	}

	exists, err := repo.UserExistsByID(c.Request().Context(), userID)
	if err != nil {
		log.Error("middleware: user existence check failed", zap.Error(err))
		return httpx.InternalError(c)
	}
	if !exists {
		return httpx.Unauthorized(c, "not authenticated")
	}
	return nil
}

func extractBearerToken(c echo.Context) (string, error) {
	header := c.Request().Header.Get(echo.HeaderAuthorization)
	if !strings.HasPrefix(header, "Bearer ") {
		return "", errors.New("missing or malformed authorization header")
	}
	return strings.TrimPrefix(header, "Bearer "), nil
}
