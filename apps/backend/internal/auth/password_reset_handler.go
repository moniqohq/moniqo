package auth

import (
	"context"
	"errors"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

// PasswordResetService is the service contract required by PasswordResetHandler.
type PasswordResetService interface {
	RequestReset(ctx context.Context, req RequestResetRequest) error
	ConfirmReset(ctx context.Context, req ConfirmResetRequest) error
}

// PasswordResetHandler holds HTTP handlers for the password reset flow.
type PasswordResetHandler struct {
	svc PasswordResetService
	log *zap.Logger
}

// NewPasswordResetHandler returns a PasswordResetHandler wired to the given service.
func NewPasswordResetHandler(svc PasswordResetService, log *zap.Logger) *PasswordResetHandler {
	return &PasswordResetHandler{svc: svc, log: log}
}

type requestResetBody struct {
	Email string `json:"email"`
}

// RequestReset handles POST /api/v1/auth/password-reset.
// Always returns 200 regardless of whether the email exists or the send succeeds.
func (h *PasswordResetHandler) RequestReset(c echo.Context) error {
	h.log.Debug("received password reset request")

	var body requestResetBody
	if err := c.Bind(&body); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "body", Error: "invalid json"}})
	}

	if errs := validator.ValidateRequestReset(validator.RequestResetInput{Email: body.Email}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	if err := h.svc.RequestReset(c.Request().Context(), RequestResetRequest{Email: body.Email}); err != nil {
		h.log.Error("password reset request failed", zap.String("email", body.Email), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "if an account with that email exists, a reset link has been sent")
}

type confirmResetBody struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

// ConfirmReset handles POST /api/v1/auth/password-reset/confirm.
func (h *PasswordResetHandler) ConfirmReset(c echo.Context) error {
	h.log.Debug("received password reset confirmation")

	var body confirmResetBody
	if err := c.Bind(&body); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "body", Error: "invalid json"}})
	}

	if errs := validator.ValidateConfirmReset(validator.ConfirmResetInput{
		Token:       body.Token,
		NewPassword: body.NewPassword,
	}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	err := h.svc.ConfirmReset(c.Request().Context(), ConfirmResetRequest{
		Token:       body.Token,
		NewPassword: body.NewPassword,
	})
	if errors.Is(err, ErrInvalidResetToken) {
		return httpx.Unauthorized(c, "unauthorized")
	}
	if err != nil {
		h.log.Error("password reset confirmation failed", zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "password reset successfully, please log in")
}
