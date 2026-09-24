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

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRenderTemplate(t *testing.T) {
	t.Parallel()

	t.Run("Verification", func(t *testing.T) {
		t.Parallel()

		data := map[string]any{
			"Name":            "Alice",
			"VerificationURL": "https://app.moniqo.in/verify?token=abc123",
			"ExpiresIn":       "24 hours",
		}

		out, err := renderTemplate(TemplateVerification, data)
		require.NoError(t, err)

		assert.Equal(t, "Verify your Moniqo account", out.Subject)

		assert.True(t, strings.Contains(out.HTMLBody, "Alice"), "HTML body should include recipient name")
		assert.True(
			t,
			strings.Contains(out.HTMLBody, "https://app.moniqo.in/verify?token=abc123"),
			"HTML body should include verification URL",
		)
		assert.True(t, strings.Contains(out.HTMLBody, "24 hours"), "HTML body should include expiry")
		assert.True(t, strings.Contains(out.HTMLBody, "<!doctype html"), "HTML body should be a full HTML document")

		assert.True(t, strings.Contains(out.TextBody, "Alice"), "text body should include recipient name")
		assert.True(
			t,
			strings.Contains(out.TextBody, "https://app.moniqo.in/verify?token=abc123"),
			"text body should include verification URL",
		)
	})

	t.Run("PasswordReset", func(t *testing.T) {
		t.Parallel()

		data := map[string]any{
			"Name":      "Bob",
			"ResetURL":  "https://app.moniqo.in/reset?token=xyz789",
			"ExpiresIn": "1 hour",
		}

		out, err := renderTemplate(TemplatePasswordReset, data)
		require.NoError(t, err)

		assert.Equal(t, "Reset your Moniqo password", out.Subject)
		assert.True(t, strings.Contains(out.HTMLBody, "Bob"))
		assert.True(t, strings.Contains(out.HTMLBody, "https://app.moniqo.in/reset?token=xyz789"))
		assert.True(t, strings.Contains(out.TextBody, "https://app.moniqo.in/reset?token=xyz789"))
	})

	t.Run("NoName", func(t *testing.T) {
		t.Parallel()

		data := map[string]any{
			"Name":            "",
			"VerificationURL": "https://example.com/verify",
			"ExpiresIn":       "24 hours",
		}

		out, err := renderTemplate(TemplateVerification, data)
		require.NoError(t, err)

		// Should not include a comma-then-empty-name
		assert.False(t, strings.Contains(out.HTMLBody, ", !"), "should not render ', !' when name is empty")
	})

	t.Run("UnknownTemplate", func(t *testing.T) {
		t.Parallel()

		_, err := renderTemplate("nonexistent", map[string]any{})
		assert.Error(t, err)
	})

	t.Run("EmailChangeCode", func(t *testing.T) {
		t.Parallel()

		data := map[string]any{
			"Name":        "Carol",
			"Code":        "483920",
			"NewEmail":    "new@example.com",
			"ExpiresIn":   "15 minutes",
			"MaxAttempts": 3,
		}

		out, err := renderTemplate(TemplateEmailChangeCode, data)
		require.NoError(t, err)

		assert.Equal(t, "Confirm your new Moniqo email address", out.Subject)
		assert.True(t, strings.Contains(out.HTMLBody, "Carol"))
		assert.True(t, strings.Contains(out.HTMLBody, "483920"))
		assert.True(t, strings.Contains(out.HTMLBody, "new@example.com"))
		assert.True(t, strings.Contains(out.HTMLBody, "<!doctype html"), "HTML body should be a full HTML document")
		assert.True(t, strings.Contains(out.TextBody, "483920"))
		assert.True(t, strings.Contains(out.TextBody, "new@example.com"))
	})

	t.Run("EmailChangeCodeNoName", func(t *testing.T) {
		t.Parallel()

		data := map[string]any{
			"Name":        "",
			"Code":        "111111",
			"NewEmail":    "new@example.com",
			"ExpiresIn":   "15 minutes",
			"MaxAttempts": 3,
		}

		out, err := renderTemplate(TemplateEmailChangeCode, data)
		require.NoError(t, err)
		assert.False(t, strings.Contains(out.HTMLBody, ", !"), "should not render ', !' when name is empty")
	})

	t.Run("EmailChangeRequested", func(t *testing.T) {
		t.Parallel()

		data := map[string]any{
			"Name":         "Dave",
			"NewEmail":     "new@example.com",
			"ExpiresIn":    "15 minutes",
			"SupportEmail": "support@moniqo.in",
		}

		out, err := renderTemplate(TemplateEmailChangeRequested, data)
		require.NoError(t, err)

		assert.Equal(t, "An email change was requested on your Moniqo account", out.Subject)
		assert.True(t, strings.Contains(out.HTMLBody, "Dave"))
		assert.True(t, strings.Contains(out.HTMLBody, "new@example.com"))
		assert.True(t, strings.Contains(out.HTMLBody, "support@moniqo.in"))
		assert.True(t, strings.Contains(out.TextBody, "new@example.com"))
		assert.True(t, strings.Contains(out.TextBody, "support@moniqo.in"))
	})

	t.Run("EmailChangeCompleted", func(t *testing.T) {
		t.Parallel()

		data := map[string]any{
			"Name":         "Erin",
			"NewEmail":     "new@example.com",
			"SupportEmail": "support@moniqo.in",
		}

		out, err := renderTemplate(TemplateEmailChangeCompleted, data)
		require.NoError(t, err)

		assert.Equal(t, "Your Moniqo email address was changed", out.Subject)
		assert.True(t, strings.Contains(out.HTMLBody, "Erin"))
		assert.True(t, strings.Contains(out.HTMLBody, "new@example.com"))
		assert.True(t, strings.Contains(out.TextBody, "new@example.com"))
	})
}
