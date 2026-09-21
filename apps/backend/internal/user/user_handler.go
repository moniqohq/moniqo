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
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
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

	// defaultMaxAvatarBytes is used until SetAvatarLimit is called; keeping a
	// sane default means tests that never call SetAvatarLimit still behave
	// reasonably rather than accepting unbounded uploads.
	defaultMaxAvatarBytes = 2 << 20 // 2MB

	pictureFormField = "file"
)

// isAllowedAvatarType reports whether a sniffed content type is on the
// upload allowlist. Deliberately excludes SVG (script-capable — this
// allowlist is what blocks stored XSS via a crafted upload) and GIF (no
// client-side resize path produces animated GIFs, so there's no legitimate
// use case).
func isAllowedAvatarType(contentType string) bool {
	switch contentType {
	case "image/jpeg", "image/png", "image/webp":
		return true
	default:
		return false
	}
}

// Service is the service contract required by Handler.
//
//nolint:interfacebloat
type Service interface {
	Register(ctx context.Context, req RegisterRequest) (models.User, error)
	GetByID(ctx context.Context, id int64) (models.User, error)
	ReplaceProfile(ctx context.Context, id int64, req ReplaceProfileRequest) (models.User, error)
	PatchProfile(ctx context.Context, id int64, req PatchProfileRequest) (models.User, error)
	Delete(ctx context.Context, p DeleteAccountParams) error
	VerifyEmail(ctx context.Context, token string) error
	SetPicture(ctx context.Context, id int64, in PictureUpload) (models.User, error)
	DeletePicture(ctx context.Context, id int64) (models.User, error)
	OpenPicture(ctx context.Context, id int64) (PictureResult, error)

	// Verified-email-change (OTP), see user_emailchange_service.go.
	RequestEmailChange(ctx context.Context, id int64, req RequestEmailChangeRequest) (EmailChangeStatus, error)
	VerifyEmailChange(ctx context.Context, id int64, req VerifyEmailChangeRequest) (models.User, error)
	CancelEmailChange(ctx context.Context, id int64) error
	GetEmailChangeStatus(ctx context.Context, id int64) (EmailChangeStatus, error)
}

// Handler holds HTTP handlers for user endpoints.
type Handler struct {
	svc            Service
	appBaseURL     string
	log            *zap.Logger
	maxAvatarBytes int64
}

// NewHandler returns a user Handler wired to the given service.
func NewHandler(svc Service, appBaseURL string, log *zap.Logger) *Handler {
	return &Handler{svc: svc, appBaseURL: appBaseURL, log: log, maxAvatarBytes: defaultMaxAvatarBytes}
}

// SetAvatarLimit overrides the maximum accepted avatar upload size in bytes.
func (h *Handler) SetAvatarLimit(n int64) {
	h.maxAvatarBytes = n
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
		h.log.Debug(
			"registration conflict: username or email already taken",
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
		Name:       req.Name,
		Username:   req.Username,
		Email:      req.Email,
		Picture:    req.Picture,
		Currency:   req.Currency,
		Timezone:   req.Timezone,
		DateFormat: req.DateFormat,
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
		Currency:        req.Currency,
		Timezone:        req.Timezone,
		DateFormat:      req.DateFormat,
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

// DeleteProfile handles DELETE /api/v1/users/{id}. Deletion requires the
// caller's current password and is idempotent.
func (h *Handler) DeleteProfile(c echo.Context) error {
	h.log.Debug("received delete profile request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	var req DeleteAccountRequest
	if err := c.Bind(&req); err != nil {
		h.log.Debug("failed to bind delete account request body", zap.Error(err))
		return httpx.ValidationError(c, []httpx.FieldError{{Field: fieldBody, Error: errInvalidJSON}})
	}

	if errs := validator.ValidateDeleteAccount(validator.DeleteAccountInput{
		CurrentPassword: req.CurrentPassword,
	}); len(errs) > 0 {
		return httpx.ValidationError(c, errs)
	}

	// resolveOwnership already confirmed claims are present on this request.
	claims, _ := auth.ClaimsFromContext(c)
	jti, err := uuid.Parse(claims.ID)
	if err != nil {
		h.log.Error("delete profile: malformed jti claim in token", zap.String("jti", claims.ID))
		return httpx.InternalError(c)
	}

	err = h.svc.Delete(c.Request().Context(), DeleteAccountParams{
		UserID:          userID,
		CurrentPassword: *req.CurrentPassword,
		JTI:             jti,
		ExpiresAt:       claims.ExpiresAt.Time,
	})
	if err != nil {
		return h.mapDeleteErr(c, userID, err)
	}

	return httpx.OK(c, nil, "user deleted successfully")
}

// VerifyEmail handles GET /api/v1/users/verify?token=...
// On success it redirects to /login; on failure it returns 400.
func (h *Handler) VerifyEmail(c echo.Context) error {
	token := c.QueryParam("token")
	if token == "" {
		return httpx.ValidationError(c, []httpx.FieldError{{Field: "token", Error: "token is required"}})
	}

	err := h.svc.VerifyEmail(c.Request().Context(), token)
	if errors.Is(err, ErrInvalidVerificationToken) {
		h.log.Debug("email verification rejected: invalid token")
		return httpx.BadRequest(c, "invalid or expired verification token")
	}
	if err != nil {
		h.log.Error("email verification failed", zap.Error(err))
		return httpx.InternalError(c)
	}

	h.log.Info("email verified successfully, redirecting to login")
	return c.Redirect(http.StatusFound, h.appBaseURL+"/login?verified=true")
}

// mapDeleteErr translates a Delete error into the matching HTTP response.
func (h *Handler) mapDeleteErr(c echo.Context, userID int64, err error) error {
	if errors.Is(err, ErrWrongPassword) {
		return httpx.Forbidden(c, "current password is incorrect")
	}
	if errors.Is(err, ErrNoPasswordCredential) {
		return httpx.Conflict(c, "set a password before deleting your account")
	}
	var lastOwner *LastOwnerError
	if errors.As(err, &lastOwner) {
		return httpx.Conflict(c, lastOwnerMessage(lastOwner.Budgets))
	}
	h.log.Error("delete profile failed", zap.Int64("user_id", userID), zap.Error(err))
	return httpx.InternalError(c)
}

// lastOwnerMessage names the budgets blocking deletion so the caller knows
// exactly which ones need an ownership transfer (or member removal) first.
func lastOwnerMessage(budgets []BlockingBudget) string {
	titles := make([]string, len(budgets))
	for i, b := range budgets {
		titles[i] = `"` + b.Title + `"`
	}
	return "transfer ownership of shared budget(s) " + strings.Join(titles, ", ") +
		" before deleting your account"
}

// UploadPicture handles PUT /api/v1/users/{id}/picture. It accepts a single
// multipart/form-data part named "file", sniffs its real content type
// (ignoring whatever Content-Type the client's multipart part claims), and
// rejects anything outside the image allowlist. On success it returns the
// full updated user, with picture set to the stable
// "/api/v1/users/{id}/picture" URL.
func (h *Handler) UploadPicture(c echo.Context) error {
	h.log.Debug("received upload picture request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	data, contentType, ok := h.readAndSniffAvatar(c, userID)
	if !ok {
		return nil // response already written by readAndSniffAvatar
	}

	sum := sha256.Sum256(data)
	pub, err := h.svc.SetPicture(c.Request().Context(), userID, PictureUpload{
		Data:        data,
		ContentType: contentType,
		ETag:        hex.EncodeToString(sum[:]),
	})
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "user not found")
	}
	if errors.Is(err, ErrStorageUnavailable) {
		h.log.Error("avatar storage unavailable", zap.Int64("user_id", userID))
		return httpx.InternalError(c)
	}
	if err != nil {
		h.log.Error("set picture failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, pub, "profile picture updated successfully")
}

// GetPicture handles GET /api/v1/users/{id}/picture. Unlike every other user
// endpoint, this one is registered as public (see newAuthSkipper in
// cmd/server/main.go): an <img> tag cannot attach an Authorization header,
// and the frontend's access token lives only in memory, so there is no way
// for a browser-rendered <img> to authenticate this request. The accepted
// trade-off is that an avatar is readable by anyone who can guess a user id
// — the same property external OIDC avatar URLs already have.
func (h *Handler) GetPicture(c echo.Context) error {
	userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		return httpx.NotFound(c, "picture not found")
	}

	result, err := h.svc.OpenPicture(c.Request().Context(), userID)
	if errors.Is(err, ErrNotFound) || errors.Is(err, ErrNoPicture) {
		return httpx.NotFound(c, "picture not found")
	}
	if errors.Is(err, ErrStorageUnavailable) {
		h.log.Error("avatar storage unavailable", zap.Int64("user_id", userID))
		return httpx.InternalError(c)
	}
	if err != nil {
		h.log.Error("open picture failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	switch result.Kind {
	case PictureExternal:
		// Safe only because users.picture can no longer hold an arbitrary
		// client-supplied string (see validator.ValidatePictureURL and the
		// read-only PATCH/PUT rejection) — otherwise this would be an open
		// redirect.
		return c.Redirect(http.StatusFound, result.ExternalURL)
	case PictureStored:
		defer result.Body.Close()
		return streamStoredPicture(c, result)
	case PictureNone:
		fallthrough
	default:
		return httpx.NotFound(c, "picture not found")
	}
}

// streamStoredPicture writes cache-validation headers and streams a locally
// (or, in the future, S3-) stored avatar. Cache-Control is "private,
// must-revalidate" rather than a long max-age: the URL is stable across
// avatar changes, so a shared/CDN cache holding a long-lived response would
// serve a stale image past an update. The strong ETag keeps revalidation
// cheap — a matching If-None-Match short-circuits to a ~200-byte 304.
func streamStoredPicture(c echo.Context, result PictureResult) error {
	etag := `"` + result.Meta.ETag + `"`
	c.Response().Header().Set("ETag", etag)
	c.Response().Header().Set("Cache-Control", "private, max-age=0, must-revalidate")
	c.Response().Header().Set("X-Content-Type-Options", "nosniff")

	if inm := c.Request().Header.Get("If-None-Match"); inm != "" && inm == etag {
		return c.NoContent(http.StatusNotModified)
	}

	return c.Stream(http.StatusOK, result.Meta.ContentType, result.Body)
}

// DeletePicture handles DELETE /api/v1/users/{id}/picture. It is idempotent:
// removing an already-absent picture is a success, matching this API's
// general idempotency convention for destructive operations.
func (h *Handler) DeletePicture(c echo.Context) error {
	h.log.Debug("received delete picture request")

	userID, ok := h.resolveOwnership(c)
	if !ok {
		return nil
	}

	pub, err := h.svc.DeletePicture(c.Request().Context(), userID)
	if errors.Is(err, ErrNotFound) {
		return httpx.NotFound(c, "user not found")
	}
	if err != nil {
		h.log.Error("delete picture failed", zap.Int64("user_id", userID), zap.Error(err))
		return httpx.InternalError(c)
	}

	return httpx.OK(c, pub, "profile picture removed successfully")
}

const errFileTooLarge = "must not exceed the maximum upload size"

// isMaxBytesError reports whether err was produced by the http.MaxBytesReader
// wrapping the request body in readAndSniffAvatar.
func isMaxBytesError(err error) bool {
	var maxBytesErr *http.MaxBytesError
	return errors.As(err, &maxBytesErr)
}

// readAndSniffAvatar extracts, size-caps, and content-sniffs the uploaded
// "file" part. On any failure it writes the HTTP response itself (following
// the same pattern as resolveOwnership) and returns ok=false; the caller
// should simply return nil.
//
//nolint:revive // a linear sequence of upload validation steps reads more clearly inline than split up further
func (h *Handler) readAndSniffAvatar(c echo.Context, userID int64) (data []byte, contentType string, ok bool) {
	// Cap the request body before any parsing touches it. Using
	// http.MaxBytesReader (rather than echo's BodyLimit middleware) keeps
	// the oversize-file error inside this handler so it can be reported
	// through the same httpx.Response envelope as every other validation
	// failure, instead of echo's own {"message": "..."} shape.
	c.Request().Body = http.MaxBytesReader(c.Response(), c.Request().Body, h.maxAvatarBytes)

	fh, err := c.FormFile(pictureFormField)
	if err != nil {
		msg := "required"
		if isMaxBytesError(err) {
			msg = errFileTooLarge
		}
		_ = httpx.ValidationError(c, []httpx.FieldError{{Field: pictureFormField, Error: msg}})
		return nil, "", false
	}

	f, err := fh.Open()
	if err != nil {
		h.log.Error("failed to open uploaded file", zap.Int64("user_id", userID), zap.Error(err))
		_ = httpx.InternalError(c)
		return nil, "", false
	}
	defer f.Close()

	data, err = io.ReadAll(io.LimitReader(f, h.maxAvatarBytes+1))
	if err != nil {
		if isMaxBytesError(err) {
			_ = httpx.ValidationError(c, []httpx.FieldError{{Field: pictureFormField, Error: errFileTooLarge}})
			return nil, "", false
		}
		h.log.Error("failed to read uploaded file", zap.Int64("user_id", userID), zap.Error(err))
		_ = httpx.InternalError(c)
		return nil, "", false
	}
	if int64(len(data)) > h.maxAvatarBytes {
		_ = httpx.ValidationError(c, []httpx.FieldError{{Field: pictureFormField, Error: errFileTooLarge}})
		return nil, "", false
	}
	if len(data) == 0 {
		_ = httpx.ValidationError(c, []httpx.FieldError{{Field: pictureFormField, Error: "must not be empty"}})
		return nil, "", false
	}

	// Sniff the real content type from the bytes; never trust the client's
	// declared Content-Type for the multipart part. This is the control
	// that keeps a mislabeled or malicious upload (e.g. an SVG renamed
	// to .png) from ever being stored or served as an image.
	sniffed := http.DetectContentType(data)
	if !isAllowedAvatarType(sniffed) {
		_ = httpx.ValidationError(c, []httpx.FieldError{{Field: pictureFormField, Error: "must be a JPEG, PNG, or WebP image"}})
		return nil, "", false
	}

	return data, sniffed, true
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
