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

package models

import (
	"fmt"
	"time"
)

// Role is the membership role a user holds within a budget.
type Role string

// Role constants ordered from most to least privileged.
const (
	RoleOwner  Role = "OWNER"
	RoleAdmin  Role = "ADMIN"
	RoleEditor Role = "EDITOR"
	RoleViewer Role = "VIEWER"
)

// ParseRole converts a string to a Role, returning an error for unknown values.
func ParseRole(s string) (Role, error) {
	switch Role(s) {
	case RoleOwner, RoleAdmin, RoleEditor, RoleViewer:
		return Role(s), nil
	default:
		return "", fmt.Errorf("unknown role %q", s)
	}
}

const (
	rankOwner  = 4
	rankAdmin  = 3
	rankEditor = 2
	rankViewer = 1
)

// IsValid reports whether r is a recognized Role constant.
func (r Role) IsValid() bool {
	_, err := ParseRole(string(r))
	return err == nil
}

// Rank returns the privilege level of the role (higher = more privileged).
// OWNER=4 > ADMIN=3 > EDITOR=2 > VIEWER=1.
func (r Role) Rank() int {
	switch r {
	case RoleOwner:
		return rankOwner
	case RoleAdmin:
		return rankAdmin
	case RoleEditor:
		return rankEditor
	case RoleViewer:
		return rankViewer
	default:
		return 0
	}
}

// Budget is the API-facing representation of a budget (tenant boundary).
// Internal fields (updated_at, deleted_at) are excluded by type.
type Budget struct {
	ID        int64     `json:"id"`
	Title     string    `json:"title"`
	Notes     *string   `json:"notes"`
	CreatedAt time.Time `json:"created_at"`
}

// BudgetUser is the API-facing representation of a budget membership record.
type BudgetUser struct {
	ID       int64     `json:"id"`
	BudgetID int64     `json:"budget_id"`
	UserID   int64     `json:"user_id"`
	Role     Role      `json:"role"`
	JoinedAt time.Time `json:"joined_at"`
}
