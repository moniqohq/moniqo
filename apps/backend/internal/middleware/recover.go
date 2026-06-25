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
			log.Error(
				"panic recovered",
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
