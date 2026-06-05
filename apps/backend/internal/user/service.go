package user

import (
	"context"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"golang.org/x/crypto/bcrypt"
)

// RegisterRequest is the input to Service.Register.
type RegisterRequest struct {
	Username string
	Password string
	Email    string
	Name     *string
}

// Service implements the business logic for user operations.
type Service struct {
	repo       *UserRepo
	bcryptCost int
}

func NewService(repo *UserRepo, bcryptCost int) *Service {
	return &Service{repo: repo, bcryptCost: bcryptCost}
}

// Register hashes the password and persists the new user, returning a
// public-safe representation on success.
func (s *Service) Register(ctx context.Context, req RegisterRequest) (PublicUser, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), s.bcryptCost)
	if err != nil {
		return PublicUser{}, err
	}

	row, err := s.repo.Create(ctx, createParams{
		Username: req.Username,
		Email:    req.Email,
		Hash:     string(hash),
		Name:     req.Name,
	})
	if err != nil {
		return PublicUser{}, err
	}

	return rowToPublic(row), nil
}

func rowToPublic(row db.CreateUserRow) PublicUser {
	pub := PublicUser{
		ID:        row.ID,
		Name:      row.Name,
		Username:  row.Username,
		Email:     row.Email,
		Picture:   row.Picture,
		Status:    Status(row.Status),
		LastLogin: nil, // always null on creation
		CreatedAt: row.CreatedAt.Time,
	}
	return pub
}
