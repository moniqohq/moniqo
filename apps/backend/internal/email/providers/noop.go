// Package providers implements email delivery backends for the Moniqo mailer.
package providers

import (
	"context"

	"go.uber.org/zap"
)

// NoopProvider discards every message and logs it instead.
// Use in development (EMAIL_PROVIDER=noop) and in tests.
type NoopProvider struct {
	log *zap.Logger
}

// NewNoop returns a NoopProvider that discards all messages and logs them instead.
func NewNoop(log *zap.Logger) *NoopProvider {
	return &NoopProvider{log: log}
}

// Send discards the message and logs it at info level.
func (n *NoopProvider) Send(_ context.Context, msg Message) error {
	n.log.Info("noop email send (discarded)",
		zap.String("to", msg.To),
		zap.String("subject", msg.Subject),
	)
	return nil
}
