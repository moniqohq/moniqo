package providers

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"mime/quotedprintable"
	"net/smtp"
	"strings"
)

// SMTPConfig holds the credentials and addressing for a standard SMTP submission
// endpoint (port 587 STARTTLS).  For implicit-TLS (port 465) use a dedicated
// provider implementation.
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	FromName string
}

type SMTPProvider struct {
	cfg SMTPConfig
}

func NewSMTP(cfg SMTPConfig) *SMTPProvider {
	return &SMTPProvider{cfg: cfg}
}

func (s *SMTPProvider) Send(ctx context.Context, msg Message) error {
	type result struct{ err error }
	ch := make(chan result, 1)
	go func() {
		var auth smtp.Auth
		if s.cfg.Username != "" {
			auth = smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
		}
		addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
		body := buildMIMEMessage(s.cfg.From, s.cfg.FromName, msg)
		ch <- result{smtp.SendMail(addr, auth, s.cfg.From, []string{msg.To}, body)}
	}()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case r := <-ch:
		return r.err
	}
}

// sanitizeHeader strips CR and LF from a value to prevent header injection.
func sanitizeHeader(s string) string {
	return strings.Map(func(r rune) rune {
		if r == '\r' || r == '\n' {
			return -1
		}
		return r
	}, s)
}

// quoteDisplayName sanitizes and RFC-5322-quotes a display name when it
// contains any specials ( ) < > [ ] : ; @ \ , . " so that a colon or angle
// bracket in the name cannot be misread as header structure.
func quoteDisplayName(name string) string {
	name = sanitizeHeader(name)
	if name == "" || !strings.ContainsAny(name, `()<>[]:;@\,."`) {
		return name
	}
	name = strings.ReplaceAll(name, `\`, `\\`)
	name = strings.ReplaceAll(name, `"`, `\"`)
	return `"` + name + `"`
}

// mimeRandBoundary returns a cryptographically random boundary string.
func mimeRandBoundary() string {
	const mimeBoundaryLen = 16
	b := make([]byte, mimeBoundaryLen)
	if _, err := rand.Read(b); err != nil {
		panic("crypto/rand unavailable: " + err.Error())
	}
	return "moniqo_" + hex.EncodeToString(b)
}

// buildMIMEMessage constructs a multipart/alternative MIME message with a
// plain-text part followed by an HTML part (RFC 2046 §5.1.4 ordering).
func buildMIMEMessage(from, fromName string, msg Message) []byte {
	boundary := mimeRandBoundary()

	var buf bytes.Buffer
	fmt.Fprintf(&buf, "From: %s <%s>\r\n", quoteDisplayName(fromName), sanitizeHeader(from))
	fmt.Fprintf(&buf, "To: %s <%s>\r\n", quoteDisplayName(msg.ToName), sanitizeHeader(msg.To))
	fmt.Fprintf(&buf, "Subject: %s\r\n", sanitizeHeader(msg.Subject))
	buf.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&buf, "Content-Type: multipart/alternative; boundary=%q\r\n", boundary)
	buf.WriteString("\r\n")

	// Plain-text part (listed first so older clients prefer it)
	fmt.Fprintf(&buf, "--%s\r\n", boundary)
	buf.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	buf.WriteString("\r\n")
	writeQP(&buf, msg.TextBody)
	buf.WriteString("\r\n")

	// HTML part
	fmt.Fprintf(&buf, "--%s\r\n", boundary)
	buf.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	buf.WriteString("\r\n")
	writeQP(&buf, msg.HTMLBody)
	buf.WriteString("\r\n")

	fmt.Fprintf(&buf, "--%s--\r\n", boundary)
	return buf.Bytes()
}

// writeQP encodes body as quoted-printable and writes it to buf.
func writeQP(buf *bytes.Buffer, body string) {
	qpw := quotedprintable.NewWriter(buf)
	_, _ = qpw.Write([]byte(body))
	_ = qpw.Close()
}
