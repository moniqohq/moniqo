package providers

import "context"

// Message is the transport-agnostic representation of an outbound email.
type Message struct {
	To       string
	ToName   string
	Subject  string
	HTMLBody string
	TextBody string
}

// Provider is the single abstraction the email worker depends on.
// Swap implementations in main.go without touching any other code.
type Provider interface {
	Send(ctx context.Context, msg Message) error
}
