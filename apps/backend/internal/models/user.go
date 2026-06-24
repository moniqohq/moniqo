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

// Package models defines the API-facing data transfer types returned by handlers.
package models

import "time"

// UserStatus represents the lifecycle state of a user account.
type UserStatus string

const (
	// UserStatusActive indicates the user has verified their account and can log in.
	UserStatusActive UserStatus = "active"

	// UserStatusPendingVerification indicates the user registered but has not yet confirmed their email.
	UserStatusPendingVerification UserStatus = "pending_verification"
)

// User is the serialized form returned in API responses.
// hash, updated_at, and deleted_at are excluded by type.
// TokensInvalidBefore is internal-only (never serialized); the middleware uses it to
// reject access tokens issued before a password reset.
type User struct {
	ID                  int64      `json:"id"`
	Name                *string    `json:"name"`
	Username            string     `json:"username"`
	Email               string     `json:"email"`
	Picture             string     `json:"picture"`
	Status              UserStatus `json:"status"`
	LastLogin           *time.Time `json:"last_login"`
	CreatedAt           time.Time  `json:"created_at"`
	TokensInvalidBefore *time.Time `json:"-"`
}
