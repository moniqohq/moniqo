package email

import "context"

// TemplateName identifies an email template pair (.html + .txt).
type TemplateName string

const (
	TemplateVerification  TemplateName = "verification"
	TemplatePasswordReset TemplateName = "password_reset"
)

// EnqueueParams is the input to Enqueuer.Enqueue.
type EnqueueParams struct {
	// IdempotencyKey prevents duplicate emails for the same logical event.
	// Convention: "<template>:<unique-id>", e.g. "verification:usr_123".
	IdempotencyKey string

	Template TemplateName
	To       string
	ToName   string

	// Payload holds template variables. Keys must match the {{.Field}} names
	// used in the template files.
	Payload map[string]any

	// MaxAttempts overrides the default retry limit (3). Zero means use the default.
	MaxAttempts int32
}

// Enqueuer is the only email dependency that UserService (and other callers) hold.
// The concrete implementation persists jobs to PostgreSQL; a future NATS or
// in-process implementation can be swapped in by changing main.go only.
type Enqueuer interface {
	Enqueue(ctx context.Context, p EnqueueParams) error
}
