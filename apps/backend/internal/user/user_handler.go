/*
 * Moniqo is a personal finance management application designed to help users
 * track, manage, and optimize their financial activities.
 *
 * Copyright (C) 2026 Moniqo <support@moniqo.in>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Package user provides HTTP handlers, service logic, and repository access for user management.
package user

import (
	"context"
	"errors"
	"strconv"

	"github.com/labstack/echo/v4"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/validator"
)

const (
	fieldBody      = "body"
	errInvalidJSON = "invalid json"
)

// Service is the service contract required by Handler.
type Service interface {
	Register(ctx context.Context, req RegisterRequest) (models.User, error)
	GetByID(ctx context.Context, id int64) (models.User, error)
	ReplaceProfile(ctx context.Context, id int64, req ReplaceProfileRequest) (models.User, error)
	PatchProfile(ctx context.Context, id int64, req PatchProfileRequest) (models.User, error)
	Delete(ctx context.Context, id int64) error
}

// Handler holds HTTP handlers for user endpoints.
type Handler struct {
	svc Service
	log *zap.Logger
}

// NewHandler returns a user Handler wired to the given service.
func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

// Register handles POST /api/v1/users.
func (h *Handler) Register(c echo.Context) error {
	h.log.Debug("received registration request")

	var req RegisterRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind registration request body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
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
	pub, err := h.svc.Register(c.Request().Context(), req)
	if errors.Is(err, ErrConflict) {
		h.log.Debug("registration conflict: username or email already taken",
			zap.String("username", req.Username),
			zap.String("email", req.Email),
		)
		return httpx.Conflict(c, "username or email already exists")
	}
	if err != nil {
		h.log.Error("registration failed", zap.Error(err))
		return httpx.InternalError(c)
	}

	h.log.Info("registration request completed", zap.Int64("user_id", pub.ID), zap.String("username", pub.Username))
	return httpx.Created(c, pub, "user created successfully")
}

// GetProfile handles GET /api/v1/users/{id}.
func (h *Handler) GetProfile(c echo.Context) error {
	h.log.Debug("received get profile request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	pub, err := h.svc.GetByID(c.Request().Context(), userID)
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "user not found")
	}
	if err != nil {
		h.log.Error("get profile failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, pub, "user fetched successfully")
}

// ReplaceProfile handles PUT /api/v1/users/{id}.
func (h *Handler) ReplaceProfile(c echo.Context) error {
	h.log.Debug("received replace profile request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	var req ReplaceProfileRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind replace profile request body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validator.ValidateReplaceProfile(validator.ReplaceProfileInput{
		Name:     req.Name,
		Username: req.Username,
		Email:    req.Email,
		Picture:  req.Picture,
	}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	pub, err := h.svc.ReplaceProfile(c.Request().Context(), userID, req)
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "user not found")
	}
	if errors.Is(err, ErrConflict) {
		return httpx.Conflict(c, "username or email already exists")
	}
	if err != nil {
		h.log.Error("replace profile failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, pub, "user updated successfully")
}

// PatchProfile handles PATCH /api/v1/users/{id}.
func (h *Handler) PatchProfile(c echo.Context) error {
	h.log.Debug("received patch profile request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	var req PatchProfileRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind patch profile request body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validator.ValidatePatchProfile(validator.PatchProfileInput{
		Name:            req.Name,
		Username:        req.Username,
		Email:           req.Email,
		Picture:         req.Picture,
		CurrentPassword: req.CurrentPassword,
		NewPassword:     req.NewPassword,
	}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	pub, err := h.svc.PatchProfile(c.Request().Context(), userID, req)
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "user not found")
	}
	if errors.Is(err, ErrConflict) {
		return httpx.Conflict(c, "username or email already exists")
	}
	if errors.Is(err, ErrWrongPassword) {
		return httpx.Forbidden(c, "current password is incorrect")
	}
	if err != nil {
		h.log.Error("patch profile failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, pub, "user updated successfully")
}

// DeleteProfile handles DELETE /api/v1/users/{id}.
func (h *Handler) DeleteProfile(c echo.Context) error {
	h.log.Debug("received delete profile request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	if err := h.svc.Delete(c.Request().Context(), userID); err != nil {
		h.log.Error("delete profile failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, nil, "user deleted successfully")
}

// resolveOwnership extracts the authenticated user id from the JWT claims and
// parses the {id} path param. On failure it writes the HTTP response and
// returns (0, false); on success it returns (userID, true).
func (h *Handler) resolveOwnership(c echo.Context) (int64, bool) {
	claims, ok := auth.ClaimsFromContext(c)
	if !ok {
		_ = httpx.Unauthorized(c, "not authenticated")
		return 0, false
	}
	authedID, err := strconv.ParseInt(claims.Subject, 10, 64)
	if err != nil {
		h.log.Error("malformed sub claim", zap.String("sub", claims.Subject))
		_ = httpx.InternalError(c)
		return 0, false
	}
	pathID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		_ = httpx.NotFound(c, "user not found")
		return 0, false
	}
	if authedID != pathID {
		_ = httpx.Forbidden(c, "access denied")
		return 0, false
	}
	return authedID, true
}
