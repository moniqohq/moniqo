package providers_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/email/providers"
)

func TestNoopProvider_Send(t *testing.T) {
	t.Parallel()

	p := providers.NewNoop(zap.NewNop())
	err := p.Send(context.Background(), providers.Message{
		To:       "user@example.com",
		ToName:   "Test User",
		Subject:  "Hello",
		HTMLBody: "<p>Hello</p>",
		TextBody: "Hello",
	})
	assert.NoError(t, err)
}

func TestNoopProvider_ImplementsInterface(t *testing.T) {
	var _ providers.Provider = (*providers.NoopProvider)(nil)
}
