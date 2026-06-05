package middleware

import (
	"log/slog"

	"github.com/labstack/echo/v4"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// Recover catches panics and returns a 500 envelope response.
func Recover() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) (err error) {
			defer func() {
				if r := recover(); r != nil {
					slog.Error("panic recovered", "panic", r)
					err = httpx.InternalError(c)
				}
			}()
			return next(c)
		}
	}
}
