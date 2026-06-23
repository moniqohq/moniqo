package middleware

import (
	"github.com/labstack/echo/v4"
	"golang.org/x/time/rate"

	echomw "github.com/labstack/echo/v4/middleware"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

const (
	authRatePerMin = 10.0
	authBurst      = 10
	secondsPerMin  = 60
)

// RegisterRateLimiter returns a rate limiter middleware scoped to the registration
// endpoint: 10 requests per IP per minute, in-memory token bucket.
func RegisterRateLimiter() echo.MiddlewareFunc {
	return newIPRateLimiter(authRatePerMin/secondsPerMin, authBurst)
}

// LoginRateLimiter returns a rate limiter middleware scoped to the login
// endpoint: 10 requests per IP per minute, in-memory token bucket.
func LoginRateLimiter() echo.MiddlewareFunc {
	return newIPRateLimiter(authRatePerMin/secondsPerMin, authBurst)
}

func newIPRateLimiter(r float64, burst int) echo.MiddlewareFunc {
	store := echomw.NewRateLimiterMemoryStoreWithConfig(
		echomw.RateLimiterMemoryStoreConfig{
			Rate:  rate.Limit(r),
			Burst: burst,
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
