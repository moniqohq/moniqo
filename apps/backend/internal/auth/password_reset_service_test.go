package auth_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	internalmock "github.com/moniqohq/moniqo/apps/backend/internal/mock"
)

func newPasswordResetSvc(repo auth.PasswordResetRepository, mailer *internalmock.EmailEnqueuer) *auth.PasswordResetSvc {
	return auth.NewPasswordResetSvc(repo, mailer, 4, time.Hour, "http://localhost:3000", zap.NewNop())
}

func makeResetUser(id int64, name, email string) auth.PasswordResetUserInfo {
	n := name
	return auth.PasswordResetUserInfo{ID: id, Name: &n, Email: email}
}

func makeValidResetToken(expiresAt time.Time) auth.PasswordResetTokenRow {
	return auth.PasswordResetTokenRow{
		ID:        [16]byte{1},
		UserID:    42,
		ExpiresAt: expiresAt,
	}
}

// --- RequestReset ---

func TestPasswordResetSvc_RequestReset_EmailExists(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	user := makeResetUser(42, "Alice", "alice@example.com")
	repo.On("GetUserForPasswordReset", "alice@example.com").Return(user, nil)
	repo.On("InvalidateUserPasswordResetTokens", int64(42)).Return(nil)
	repo.On("InsertPasswordResetToken", int64(42), mock.AnythingOfType("string"), mock.AnythingOfType("time.Time")).Return(nil)
	mailer.On("Enqueue", mock.Anything).Return(nil)

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.RequestReset(context.Background(), auth.RequestResetRequest{Email: "alice@example.com"})

	require.NoError(t, err)
	repo.AssertExpectations(t)
	mailer.AssertCalled(t, "Enqueue", mock.Anything)
}

func TestPasswordResetSvc_RequestReset_EmailNotFound(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	repo.On("GetUserForPasswordReset", "ghost@example.com").Return(auth.PasswordResetUserInfo{}, auth.ErrUserNotFound)

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.RequestReset(context.Background(), auth.RequestResetRequest{Email: "ghost@example.com"})

	require.NoError(t, err) // always nil — no enumeration
	repo.AssertNotCalled(t, "InvalidateUserPasswordResetTokens")
	repo.AssertNotCalled(t, "InsertPasswordResetToken")
	mailer.AssertNotCalled(t, "Enqueue")
	repo.AssertExpectations(t)
}

func TestPasswordResetSvc_RequestReset_InvalidatesPreviousToken(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	user := makeResetUser(42, "Alice", "alice@example.com")
	repo.On("GetUserForPasswordReset", "alice@example.com").Return(user, nil)
	repo.On("InvalidateUserPasswordResetTokens", int64(42)).Return(nil)
	repo.On("InsertPasswordResetToken", int64(42), mock.AnythingOfType("string"), mock.AnythingOfType("time.Time")).Return(nil)
	mailer.On("Enqueue", mock.Anything).Return(nil)

	svc := newPasswordResetSvc(repo, mailer)
	_ = svc.RequestReset(context.Background(), auth.RequestResetRequest{Email: "alice@example.com"})

	repo.AssertCalled(t, "InvalidateUserPasswordResetTokens", int64(42))
}

func TestPasswordResetSvc_RequestReset_EmailSendFailureIsLogged(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	user := makeResetUser(42, "Alice", "alice@example.com")
	repo.On("GetUserForPasswordReset", "alice@example.com").Return(user, nil)
	repo.On("InvalidateUserPasswordResetTokens", int64(42)).Return(nil)
	repo.On("InsertPasswordResetToken", int64(42), mock.AnythingOfType("string"), mock.AnythingOfType("time.Time")).Return(nil)
	mailer.On("Enqueue", mock.Anything).Return(errors.New("smtp down"))

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.RequestReset(context.Background(), auth.RequestResetRequest{Email: "alice@example.com"})

	require.NoError(t, err) // send failure must not surface
}

// --- ConfirmReset ---

func TestPasswordResetSvc_ConfirmReset_Success(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	token := strings.Repeat("a", 64)
	tokenRow := makeValidResetToken(time.Now().Add(time.Hour))

	repo.On("GetPasswordResetTokenByHash", mock.AnythingOfType("string")).Return(tokenRow, nil)
	repo.On("ConfirmResetTransaction", mock.AnythingOfType("auth.ConfirmResetTxParams")).Return(nil)

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.ConfirmReset(context.Background(), auth.ConfirmResetRequest{
		Token:       token,
		NewPassword: "NewSecurePass1",
	})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestPasswordResetSvc_ConfirmReset_TokenNotFound(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	repo.On("GetPasswordResetTokenByHash", mock.AnythingOfType("string")).
		Return(auth.PasswordResetTokenRow{}, auth.ErrInvalidResetToken)

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.ConfirmReset(context.Background(), auth.ConfirmResetRequest{
		Token:       strings.Repeat("b", 64),
		NewPassword: "NewSecurePass1",
	})

	assert.ErrorIs(t, err, auth.ErrInvalidResetToken)
	repo.AssertNotCalled(t, "ConfirmResetTransaction")
}

func TestPasswordResetSvc_ConfirmReset_TokenExpired(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	expired := makeValidResetToken(time.Now().Add(-time.Minute))
	repo.On("GetPasswordResetTokenByHash", mock.AnythingOfType("string")).Return(expired, nil)

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.ConfirmReset(context.Background(), auth.ConfirmResetRequest{
		Token:       strings.Repeat("c", 64),
		NewPassword: "NewSecurePass1",
	})

	assert.ErrorIs(t, err, auth.ErrInvalidResetToken)
	repo.AssertNotCalled(t, "ConfirmResetTransaction")
}

func TestPasswordResetSvc_ConfirmReset_TokenAlreadyUsed(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	usedAt := time.Now().Add(-5 * time.Minute)
	row := makeValidResetToken(time.Now().Add(time.Hour))
	row.UsedAt = &usedAt
	repo.On("GetPasswordResetTokenByHash", mock.AnythingOfType("string")).Return(row, nil)

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.ConfirmReset(context.Background(), auth.ConfirmResetRequest{
		Token:       strings.Repeat("d", 64),
		NewPassword: "NewSecurePass1",
	})

	assert.ErrorIs(t, err, auth.ErrInvalidResetToken)
	repo.AssertNotCalled(t, "ConfirmResetTransaction")
}

func TestPasswordResetSvc_ConfirmReset_TransactionReceivesCorrectUserID(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	tokenRow := makeValidResetToken(time.Now().Add(time.Hour))
	tokenRow.UserID = 99

	repo.On("GetPasswordResetTokenByHash", mock.AnythingOfType("string")).Return(tokenRow, nil)
	repo.On("ConfirmResetTransaction", mock.MatchedBy(func(p auth.ConfirmResetTxParams) bool {
		return p.UserID == 99 && p.NewHash != ""
	})).Return(nil)

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.ConfirmReset(context.Background(), auth.ConfirmResetRequest{
		Token:       strings.Repeat("e", 64),
		NewPassword: "NewSecurePass1",
	})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestPasswordResetSvc_ConfirmReset_TransactionFailurePropagates(t *testing.T) {
	t.Parallel()

	repo := &internalmock.PasswordResetRepository{}
	mailer := &internalmock.EmailEnqueuer{}

	tokenRow := makeValidResetToken(time.Now().Add(time.Hour))
	dbErr := errors.New("db unavailable")

	repo.On("GetPasswordResetTokenByHash", mock.AnythingOfType("string")).Return(tokenRow, nil)
	repo.On("ConfirmResetTransaction", mock.Anything).Return(dbErr)

	svc := newPasswordResetSvc(repo, mailer)
	err := svc.ConfirmReset(context.Background(), auth.ConfirmResetRequest{
		Token:       strings.Repeat("f", 64),
		NewPassword: "NewSecurePass1",
	})

	assert.ErrorIs(t, err, dbErr)
}
