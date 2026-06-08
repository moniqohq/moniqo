package user

import (
	"errors"

	"github.com/labstack/echo/v4"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
	"go.uber.org/zap"
)

// Handler holds HTTP handlers for user endpoints.
type Handler struct {
	svc *Service
	log *zap.Logger
}

func NewHandler(svc *Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

type registerRequest struct {
	Username string  `json:"username"`
	Password string  `json:"password"`
	Email    string  `json:"email"`
	Name     *string `json:"name"`
}

// Register handles POST /api/v1/users.
func (h *Handler) Register(c echo.Context) error {
	h.log.Debug("received registration request")

	var req registerRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind registration request body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "body", Error: "invalid json"}})
	}

	h.log.Debug("validating registration input", zap.String("username", req.Username), zap.String("email", req.Email))
	if errs := validator.ValidateRegister(validator.RegisterInput{
		Username: req.Username,
		Password: req.Password,
		Email:    req.Email,
		Name:     req.Name,
	}); len(errs) > 0 {
		h.log.Debug("registration input validation failed", zap.String("username", req.Username), zap.Int("error_count", len(errs)))
		return httpx.ValidationError(c, errs)
	}

	h.log.Info("dispatching registration to service", zap.String("username", req.Username), zap.String("email", req.Email))
	pub, err := h.svc.Register(c.Request().Context(), RegisterRequest{
		Username: req.Username,
		Password: req.Password,
		Email:    req.Email,
		Name:     req.Name,
	})
	if errors.Is(err, ErrConflict) {
		h.log.Debug("registration conflict: username or email already taken", zap.String("username", req.Username), zap.String("email", req.Email))
		return httpx.Conflict(c, "username or email already exists")
	}
	if err != nil {
		h.log.Error("registration failed", zap.Error(err))
		return httpx.InternalError(c)
	}

	h.log.Info("registration request completed", zap.Int64("user_id", pub.ID), zap.String("username", pub.Username))
	return httpx.Created(c, pub, "user created successfully")
}
