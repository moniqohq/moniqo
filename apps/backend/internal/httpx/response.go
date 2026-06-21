package httpx

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// Response is the standard JSON envelope returned by all API endpoints.
type Response struct {
	Success bool   `json:"success"`
	Data    any    `json:"data"`
	Msg     string `json:"msg"`
}

// FieldError represents a single field-level validation failure.
type FieldError struct {
	Field string `json:"field"`
	Error string `json:"error"`
}

// Created writes a 201 JSON response with the standard success envelope.
func Created(c echo.Context, data any, msg string) error {
	return c.JSON(http.StatusCreated, Response{Success: true, Data: data, Msg: msg})
}

// OK writes a 200 JSON response with the standard success envelope.
func OK(c echo.Context, data any, msg string) error {
	return c.JSON(http.StatusOK, Response{Success: true, Data: data, Msg: msg})
}

// ValidationError writes a 400 JSON response listing the failed field constraints.
func ValidationError(c echo.Context, fields []FieldError) error {
	return c.JSON(http.StatusBadRequest, Response{
		Success: false,
		Data:    map[string]any{"fields": fields},
		Msg:     "validation failed",
	})
}

// Conflict writes a 409 JSON response.
func Conflict(c echo.Context, msg string) error {
	return c.JSON(http.StatusConflict, Response{
		Success: false,
		Data:    nil,
		Msg:     msg,
	})
}

// InternalError writes a 500 JSON response with a generic error message.
func InternalError(c echo.Context) error {
	return c.JSON(http.StatusInternalServerError, Response{
		Success: false,
		Data:    nil,
		Msg:     "internal server error",
	})
}

// Unauthorized writes a 401 JSON response.
func Unauthorized(c echo.Context, msg string) error {
	return c.JSON(http.StatusUnauthorized, Response{
		Success: false,
		Data:    nil,
		Msg:     msg,
	})
}

// Forbidden writes a 403 JSON response.
func Forbidden(c echo.Context, msg string) error {
	return c.JSON(http.StatusForbidden, Response{
		Success: false,
		Data:    nil,
		Msg:     msg,
	})
}

// NotFound writes a 404 JSON response.
func NotFound(c echo.Context, msg string) error {
	return c.JSON(http.StatusNotFound, Response{
		Success: false,
		Data:    nil,
		Msg:     msg,
	})
}

// TooManyRequests writes a 429 JSON response with a generic rate-limit message.
func TooManyRequests(c echo.Context) error {
	return c.JSON(http.StatusTooManyRequests, Response{
		Success: false,
		Data:    nil,
		Msg:     "too many requests",
	})
}
