package middleware

import (
	"fmt"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

// Recover catches panics and returns a 500 envelope response.
func Recover(log *zap.Logger) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			return handleWithRecover(c, next, log)
		}
	}
}

func handleWithRecover(c echo.Context, next echo.HandlerFunc, log *zap.Logger) (err error) {
	defer func() {
		if r := recover(); r != nil {
			log.Error("panic recovered",
				zap.String("panic", fmt.Sprintf("%v", r)),
				zap.String("request_id", c.Response().Header().Get(echo.HeaderXRequestID)),
			)
			if !c.Response().Committed {
				err = httpx.InternalError(c)
			}
		}
	}()
	return next(c)
}
