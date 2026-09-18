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

package main

import (
	"net/http"
	"testing"

	"github.com/labstack/echo/v4"
	"github.com/stretchr/testify/assert"
)

// TestAuthSkipperAvatarRoute is a regression test for the regexp branch added
// to publicRoute: the avatar GET endpoint must be public, but the regex must
// be narrow enough that it does not also expose the full-profile GET.
func TestAuthSkipperAvatarRoute(t *testing.T) {
	t.Parallel()

	skipper := newAuthSkipper()
	e := echo.New()

	isSkipped := func(method, path string) bool {
		req, _ := http.NewRequest(method, path, nil)
		c := e.NewContext(req, nil)
		return skipper(c)
	}

	assert.True(t, isSkipped(http.MethodGet, "/api/v1/users/7/picture"), "GET .../picture must be public")
	assert.True(t, isSkipped(http.MethodGet, "/api/v1/users/12345/picture"), "GET .../picture must be public for any numeric id")

	assert.False(t, isSkipped(http.MethodGet, "/api/v1/users/7"), "GET on the full profile must stay authenticated")
	assert.False(t, isSkipped(http.MethodGet, "/api/v1/users/"), "must not match a non-numeric or missing id")
	assert.False(t, isSkipped(http.MethodGet, "/api/v1/users/7/picture/extra"), "must be exact, not a prefix match")
	assert.False(t, isSkipped(http.MethodPut, "/api/v1/users/7/picture"), "must not exempt the authenticated PUT upload endpoint")
	assert.False(t, isSkipped(http.MethodDelete, "/api/v1/users/7/picture"), "must not exempt the authenticated DELETE endpoint")
}
