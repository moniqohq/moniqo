package auth

import (
	"errors"
	"strconv"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

// Handler holds HTTP handlers for auth endpoints.
type Handler struct {
	svc AuthService
	log *zap.Logger
}

func NewHandler(svc *AuthSvc, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

// Login handles POST /api/v1/auth/login.
func (h *Handler) Login(c echo.Context) error {
	h.log.Debug("received login request")

	var req LoginRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind login request body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "body", Error: "invalid json"}})
	}

	h.log.Debug("validating login input", zap.String("email", req.Email))
	if errs := validator.ValidateLogin(validator.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	}); len(errs) > 0 {
		h.log.Debug("login input validation failed", zap.String("email", req.Email), zap.Int("error_count", len(errs)))
		return httpx.ValidationError(c, errs)
	}

	h.log.Info("dispatching login to service", zap.String("email", req.Email))
	result, err := h.svc.Login(c.Request().Context(), req)
	if errors.Is(err, ErrInvalidCredentials) {
		h.log.Debug("login rejected: invalid credentials", zap.String("email", req.Email))
		return httpx.Unauthorized(c, "invalid credentials")
	}
	if errors.Is(err, ErrPendingVerification) {
		h.log.Debug("login rejected: account not yet verified", zap.String("email", req.Email))
		return httpx.Forbidden(c, "account not yet verified")
	}
	if err != nil {
		h.log.Error("login failed", zap.Error(err))
		return httpx.InternalError(c)
	}

	h.log.Info("login request completed", zap.String("email", req.Email))
	return httpx.OK(c, LoginResponseData{
		AccessToken: result.AccessToken,
		TokenType:   result.TokenType,
	}, "login successful")
}

// Logout handles POST /api/v1/auth/logout.
func (h *Handler) Logout(c echo.Context) error {
	h.log.Debug("received logout request")

	claims, ok := ClaimsFromContext(c)
	if !ok {
		return httpx.Unauthorized(c, "not authenticated")
	}

	userID, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		h.log.Error("logout: malformed sub claim in token", zap.String("sub", claims.Subject))
		return httpx.InternalError(c)
	}

	jti, err := uuid.Parse(claims.ID)
	if err != nil {
		h.log.Error("logout: malformed jti claim in token", zap.String("jti", claims.ID))
		return httpx.InternalError(c)
	}

	if err := h.svc.Logout(c.Request().Context(), LogoutParams{
		JTI:       jti,
		UserID:    userID,
		ExpiresAt: claims.ExpiresAt.Time,
	}); err != nil {
		h.log.Error("logout failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	h.log.Info("logout request completed", zap.Int64("user_id", userID))
	return httpx.OK(c, nil, "logged out successfully")
}
