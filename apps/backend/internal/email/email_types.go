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

package email

import "context"

// TemplateName identifies an email template pair (.html + .txt).
type TemplateName string

// Email template name constants for supported notification types.
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
