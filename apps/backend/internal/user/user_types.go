package user

import "errors"

// -----------------------------------------------------------------------------
// Handler layer
// -----------------------------------------------------------------------------

// RegisterRequest is the HTTP request body for POST /api/v1/users and the
// service-layer input to UserSvc.Register.
type RegisterRequest struct {
	Username string  `json:"username"`
	Password string  `json:"password"`
	Email    string  `json:"email"`
	Name     *string `json:"name"`
}

// -----------------------------------------------------------------------------
// Repository layer
// -----------------------------------------------------------------------------

// ErrConflict is returned when a unique constraint is violated (username or email).
var ErrConflict = errors.New("username or email already exists")

// CreateParams holds the values needed to insert a new user row.
type CreateParams struct {
	Username string
	Email    string
	Hash     string
	Name     *string
}
