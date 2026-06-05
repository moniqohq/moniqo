package user

import "time"

type Status string

const (
	StatusPendingVerification Status = "pending_verification"
	StatusActive              Status = "active"
)

// PublicUser is the serialized form returned in API responses.
// hash, updated_at, and deleted_at are excluded by type — stripping happens here,
// not in individual handlers.
type PublicUser struct {
	ID        int64      `json:"id"`
	Name      *string    `json:"name"`
	Username  string     `json:"username"`
	Email     string     `json:"email"`
	Picture   string     `json:"picture"`
	Status    Status     `json:"status"`
	LastLogin *time.Time `json:"last_login"`
	CreatedAt time.Time  `json:"created_at"`
}
