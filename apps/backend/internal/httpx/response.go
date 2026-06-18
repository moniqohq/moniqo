package httpx

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

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

func Created(c echo.Context, data any, msg string) error {
	return c.JSON(http.StatusCreated, Response{Success: true, Data: data, Msg: msg})
}

func OK(c echo.Context, data any, msg string) error {
	return c.JSON(http.StatusOK, Response{Success: true, Data: data, Msg: msg})
}

func ValidationError(c echo.Context, fields []FieldError) error {
	return c.JSON(http.StatusBadRequest, Response{
		Success: false,
		Data:    map[string]any{"fields": fields},
		Msg:     "validation failed",
	})
}

func Conflict(c echo.Context, msg string) error {
	return c.JSON(http.StatusConflict, Response{
		Success: false,
		Data:    nil,
		Msg:     msg,
	})
}

func InternalError(c echo.Context) error {
	return c.JSON(http.StatusInternalServerError, Response{
		Success: false,
		Data:    nil,
		Msg:     "internal server error",
	})
}

func Unauthorized(c echo.Context, msg string) error {
	return c.JSON(http.StatusUnauthorized, Response{
		Success: false,
		Data:    nil,
		Msg:     msg,
	})
}

func Forbidden(c echo.Context, msg string) error {
	return c.JSON(http.StatusForbidden, Response{
		Success: false,
		Data:    nil,
		Msg:     msg,
	})
}

func NotFound(c echo.Context, msg string) error {
	return c.JSON(http.StatusNotFound, Response{
		Success: false,
		Data:    nil,
		Msg:     msg,
	})
}

func TooManyRequests(c echo.Context) error {
	return c.JSON(http.StatusTooManyRequests, Response{
		Success: false,
		Data:    nil,
		Msg:     "too many requests",
	})
}
