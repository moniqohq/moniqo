// Package httpx provides shared HTTP response types and error constants for the Moniqo API.
package httpx

// API error code constants used in the response envelope's "code" field.
const (
	CodeValidationError = "VALIDATION_ERROR"
	CodeConflict        = "CONFLICT"
	CodeRateLimited     = "RATE_LIMITED"
	CodeInternalError   = "INTERNAL_ERROR"
	CodeNotFound        = "NOT_FOUND"
	CodeUnauthorized    = "UNAUTHORIZED"
	CodeForbidden       = "FORBIDDEN"
)
