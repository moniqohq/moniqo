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

package budget

import (
	"context"
	"errors"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/authz"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

type contextKey string

const membershipContextKey contextKey = "budget_membership"

// MembershipReader is the minimal interface the authz guard needs from the
// membership repository. Defined here so it can be satisfied by MembershipRepo
// and by a test double.
type MembershipReader interface {
	GetMembership(ctx context.Context, budgetID, userID int64) (models.BudgetUser, error)
}

// RequireBudgetAccess returns Echo middleware that:
//  1. Reads the authenticated user from context (set by the global auth.Middleware).
//  2. Parses the :id path parameter as the budget ID.
//  3. Looks up the user's active membership in that budget.
//  4. Evaluates authz.Can(role, action); returns 404 for non-members (never
//     reveals whether the budget exists) and 403 for insufficient role.
//  5. Injects the resolved models.BudgetUser into the request context for
//     downstream handlers.
func RequireBudgetAccess(repo MembershipReader, action authz.Action, log *zap.Logger) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			return checkBudgetAccess(c, next, repo, action, log)
		}
	}
}

func checkBudgetAccess(c echo.Context, next echo.HandlerFunc, repo MembershipReader, action authz.Action, log *zap.Logger) error {
	user, ok := auth.UserFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	budgetID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "budget not found")
	}

	membership, err := repo.GetMembership(c.Request().Context(), budgetID, user.ID)
	if err != nil {
		return handleMembershipLookupErr(c, err, budgetID, user.ID, log)
	}

	if !authz.Can(membership.Role, action) {
		return httpx.Forbidden(c, "insufficient role")
	}

	setBudgetMembershipInContext(c, membership)
	return next(c)
}

func handleMembershipLookupErr(c echo.Context, err error, budgetID, userID int64, log *zap.Logger) error {
	if errors.Is(err, ErrMembershipNotFound) {
		// Return 404 — never reveal whether the budget exists to non-members.
		return httpx.NotFound(c, "budget not found")
	}
	log.Error(
		"authz: membership lookup failed",
		zap.Int64("budget_id", budgetID),
		zap.Int64("user_id", userID),
		zap.Error(err),
	)
	return httpx.InternalError(c)
}

// MembershipFromContext retrieves the resolved BudgetUser injected by
// RequireBudgetAccess. Returns (zero, false) if not present.
func MembershipFromContext(c echo.Context) (models.BudgetUser, bool) {
	v := c.Get(string(membershipContextKey))
	m, ok := v.(models.BudgetUser)
	return m, ok
}

func setBudgetMembershipInContext(c echo.Context, m models.BudgetUser) {
	c.Set(string(membershipContextKey), m)
}
