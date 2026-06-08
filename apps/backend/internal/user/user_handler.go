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
	var req registerRequest
	if err := c.Bind(&req); err != nil {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "body", Error: "invalid json"}})
	}

	if errs := validator.ValidateRegister(validator.RegisterInput{
		Username: req.Username,
		Password: req.Password,
		Email:    req.Email,
		Name:     req.Name,
	}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	pub, err := h.svc.Register(c.Request().Context(), RegisterRequest{
		Username: req.Username,
		Password: req.Password,
		Email:    req.Email,
		Name:     req.Name,
	})
	if errors.Is(err, ErrConflict) {
		return httpx.Conflict(c, "username or email already exists")
	}
	if err != nil {
		h.log.Error("registration failed", zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.Created(c, pub, "user created successfully")
}
