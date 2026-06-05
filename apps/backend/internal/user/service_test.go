package user

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
)

// stubRepo is an in-package stub implementing userRepository.
type stubRepo struct {
	row db.CreateUserRow
	err error
}

func (s *stubRepo) Create(_ context.Context, _ createParams) (db.CreateUserRow, error) {
	return s.row, s.err
}

func makeRow(username, email string) db.CreateUserRow {
	now := pgtype.Timestamptz{Time: time.Now(), Valid: true}
	return db.CreateUserRow{
		ID:        1,
		Username:  username,
		Email:     email,
		Name:      nil,
		Picture:   "",
		Status:    db.UserStatusPendingVerification,
		CreatedAt: now,
	}
}

func TestService_Register_Success(t *testing.T) {
	stub := &stubRepo{row: makeRow("saqibtest", "saqib@example.com")}
	svc := &Service{repo: stub, bcryptCost: 4}

	pub, err := svc.Register(context.Background(), RegisterRequest{
		Username: "saqibtest",
		Password: "SecurePass1",
		Email:    "saqib@example.com",
	})

	require.NoError(t, err)
	assert.Equal(t, "saqibtest", pub.Username)
	assert.Equal(t, "saqib@example.com", pub.Email)
	assert.Equal(t, StatusPendingVerification, pub.Status)
	assert.Nil(t, pub.LastLogin)
}

func TestService_Register_PropagatesConflict(t *testing.T) {
	stub := &stubRepo{err: ErrConflict}
	svc := &Service{repo: stub, bcryptCost: 4}

	_, err := svc.Register(context.Background(), RegisterRequest{
		Username: "saqibtest",
		Password: "SecurePass1",
		Email:    "saqib@example.com",
	})

	assert.True(t, errors.Is(err, ErrConflict))
}

func TestService_Register_PropagatesRepoError(t *testing.T) {
	repoErr := errors.New("db unavailable")
	stub := &stubRepo{err: repoErr}
	svc := &Service{repo: stub, bcryptCost: 4}

	_, err := svc.Register(context.Background(), RegisterRequest{
		Username: "saqibtest",
		Password: "SecurePass1",
		Email:    "saqib@example.com",
	})

	assert.ErrorIs(t, err, repoErr)
}

func TestService_Register_HashIsNotPassword(t *testing.T) {
	var capturedParams createParams
	stub := &captureRepo{
		row: makeRow("saqibtest", "saqib@example.com"),
		capture: func(p createParams) { capturedParams = p },
	}
	svc := &Service{repo: stub, bcryptCost: 4}

	_, err := svc.Register(context.Background(), RegisterRequest{
		Username: "saqibtest",
		Password: "SecurePass1",
		Email:    "saqib@example.com",
	})

	require.NoError(t, err)
	assert.NotEqual(t, "SecurePass1", capturedParams.Hash, "plaintext password must not be stored")
	assert.NotEmpty(t, capturedParams.Hash)
}

// captureRepo records the createParams passed to Create.
type captureRepo struct {
	row     db.CreateUserRow
	capture func(createParams)
}

func (c *captureRepo) Create(_ context.Context, p createParams) (db.CreateUserRow, error) {
	c.capture(p)
	return c.row, nil
}
