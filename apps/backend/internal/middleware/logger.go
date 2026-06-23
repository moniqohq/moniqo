// Package middleware provides Echo middleware for the Moniqo HTTP server.
package middleware

import (
	"time"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"
)

// RequestLogger returns an Echo middleware that emits a structured log entry
// for every request. It captures method, URI, status, latency, and the
// request-id assigned by Echo's RequestID middleware.
func RequestLogger(log *zap.Logger) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			err := next(c)

			req := c.Request()
			res := c.Response()

			fields := []zap.Field{
				zap.String("request_id", res.Header().Get(echo.HeaderXRequestID)),
				zap.String("method", req.Method),
				zap.String("uri", req.RequestURI),
				zap.Int("status", res.Status),
				zap.Duration("latency", time.Since(start)),
				zap.String("remote_ip", c.RealIP()),
			}

			if err != nil {
				fields = append(fields, zap.Error(err))
				log.Warn("request completed with error", fields...)
			} else {
				log.Info("request", fields...)
			}

			return err
		}
	}
}
