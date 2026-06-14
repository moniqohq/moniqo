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
		assert.True(t, strings.Contains(out.HTMLBody, "https://app.moniqo.in/verify?token=abc123"), "HTML body should include verification URL")
		assert.True(t, strings.Contains(out.HTMLBody, "24 hours"), "HTML body should include expiry")
		assert.True(t, strings.Contains(out.HTMLBody, "<!DOCTYPE html"), "HTML body should be a full HTML document")

		assert.True(t, strings.Contains(out.TextBody, "Alice"), "text body should include recipient name")
		assert.True(t, strings.Contains(out.TextBody, "https://app.moniqo.in/verify?token=abc123"), "text body should include verification URL")
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
}
