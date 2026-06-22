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
type User struct {
	ID        int64      `json:"id"`
	Name      *string    `json:"name"`
	Username  string     `json:"username"`
	Email     string     `json:"email"`
	Picture   string     `json:"picture"`
	Status    UserStatus `json:"status"`
	LastLogin *time.Time `json:"last_login"`
	CreatedAt time.Time  `json:"created_at"`
}
