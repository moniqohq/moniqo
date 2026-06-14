package providers

import (
	"bytes"
	"context"
	"fmt"
	"net/smtp"
	"strconv"
	"time"
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

func (s *SMTPProvider) Send(_ context.Context, msg Message) error {
	auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	body := buildMIMEMessage(s.cfg.From, s.cfg.FromName, msg)
	return smtp.SendMail(addr, auth, s.cfg.From, []string{msg.To}, body)
}

// buildMIMEMessage constructs a multipart/alternative MIME message with a
// plain-text part followed by an HTML part (RFC 2046 §5.1.4 ordering).
func buildMIMEMessage(from, fromName string, msg Message) []byte {
	boundary := "moniqo_" + strconv.FormatInt(time.Now().UnixNano(), 36)

	var buf bytes.Buffer
	fmt.Fprintf(&buf, "From: %s <%s>\r\n", fromName, from)
	fmt.Fprintf(&buf, "To: %s <%s>\r\n", msg.ToName, msg.To)
	fmt.Fprintf(&buf, "Subject: %s\r\n", msg.Subject)
	buf.WriteString("MIME-Version: 1.0\r\n")
	fmt.Fprintf(&buf, "Content-Type: multipart/alternative; boundary=%q\r\n", boundary)
	buf.WriteString("\r\n")

	// Plain-text part (listed first so older clients prefer it)
	fmt.Fprintf(&buf, "--%s\r\n", boundary)
	buf.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	buf.WriteString("\r\n")
	buf.WriteString(msg.TextBody)
	buf.WriteString("\r\n")

	// HTML part
	fmt.Fprintf(&buf, "--%s\r\n", boundary)
	buf.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	buf.WriteString("\r\n")
	buf.WriteString(msg.HTMLBody)
	buf.WriteString("\r\n")

	fmt.Fprintf(&buf, "--%s--\r\n", boundary)
	return buf.Bytes()
}
