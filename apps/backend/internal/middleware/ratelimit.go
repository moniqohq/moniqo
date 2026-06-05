package middleware

import (
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// RegisterRateLimiter returns a rate limiter middleware scoped to the registration
// endpoint: 10 requests per IP per minute, in-memory token bucket.
func RegisterRateLimiter() echo.MiddlewareFunc {
	store := echomw.NewRateLimiterMemoryStoreWithConfig(
		echomw.RateLimiterMemoryStoreConfig{
			Rate:  10.0 / 60, // 10 requests per minute expressed as tokens/second
			Burst: 10,
		},
	)
	return echomw.RateLimiterWithConfig(echomw.RateLimiterConfig{
		Store: store,
		IdentifierExtractor: func(c echo.Context) (string, error) {
			return c.RealIP(), nil
		},
		DenyHandler: func(c echo.Context, _ string, _ error) error {
			return httpx.TooManyRequests(c)
		},
	})
}
