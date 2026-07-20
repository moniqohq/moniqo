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

package providers

import (
	"bytes"
	"context"
	"crypto/rand"
	"crypto/tls"
	"encoding/hex"
	"fmt"
	"mime/quotedprintable"
	"net/smtp"
	"strings"
)

// implicitTLSPort is the standard port for SMTPS (TLS from the first byte,
// no STARTTLS upgrade) — e.g. Titan Mail's smtp.titan.email:465.
const implicitTLSPort = 465

// SMTPConfig holds the credentials and addressing for an SMTP submission
// endpoint. Port 587 is sent via STARTTLS; port 465 is sent via implicit TLS.
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	From     string
	FromName string
}

// SMTPProvider sends email via a standard SMTP submission endpoint.
type SMTPProvider struct {
	cfg SMTPConfig
}

// NewSMTP constructs an SMTPProvider from the given config.
func NewSMTP(cfg SMTPConfig) *SMTPProvider {
	return &SMTPProvider{cfg: cfg}
}

// Send delivers msg using SMTP, honoring ctx for cancellation.
func (s *SMTPProvider) Send(ctx context.Context, msg Message) error {
	type result struct{ err error }
	ch := make(chan result, 1)
	go func() {
		if s.cfg.Port == implicitTLSPort {
			ch <- result{s.sendImplicitTLS(msg)}
			return
		}
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
		return fmt.Errorf("smtp send cancelled: %w", ctx.Err())
	case r := <-ch:
		return r.err
	}
}

// sendImplicitTLS delivers msg over a connection that is TLS-encrypted from
// the first byte (SMTPS), as required by servers such as Titan Mail on 465
// that never advertise or accept a plaintext STARTTLS upgrade.
func (s *SMTPProvider) sendImplicitTLS(msg Message) error {
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: s.cfg.Host, MinVersion: tls.VersionTLS12})
	if err != nil {
		return fmt.Errorf("smtp tls dial: %w", err)
	}
	defer conn.Close()

	client, err := smtp.NewClient(conn, s.cfg.Host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	if s.cfg.Username != "" {
		auth := smtp.PlainAuth("", s.cfg.Username, s.cfg.Password, s.cfg.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("smtp auth: %w", err)
		}
	}
	if err := client.Mail(s.cfg.From); err != nil {
		return fmt.Errorf("smtp mail from: %w", err)
	}
	if err := client.Rcpt(msg.To); err != nil {
		return fmt.Errorf("smtp rcpt to: %w", err)
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("smtp data: %w", err)
	}
	if _, err := w.Write(buildMIMEMessage(s.cfg.From, s.cfg.FromName, msg)); err != nil {
		_ = w.Close()
		return fmt.Errorf("smtp write body: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("smtp close body: %w", err)
	}
	return client.Quit()
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
	_, _ = fmt.Fprintf(&buf, "From: %s <%s>\r\n", quoteDisplayName(fromName), sanitizeHeader(from))
	_, _ = fmt.Fprintf(&buf, "To: %s <%s>\r\n", quoteDisplayName(msg.ToName), sanitizeHeader(msg.To))
	_, _ = fmt.Fprintf(&buf, "Subject: %s\r\n", sanitizeHeader(msg.Subject))
	_, _ = buf.WriteString("MIME-Version: 1.0\r\n")
	_, _ = fmt.Fprintf(&buf, "Content-Type: multipart/alternative; boundary=%q\r\n", boundary)
	_, _ = buf.WriteString("\r\n")

	// Plain-text part (listed first so older clients prefer it)
	_, _ = fmt.Fprintf(&buf, "--%s\r\n", boundary)
	_, _ = buf.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	_, _ = buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	_, _ = buf.WriteString("\r\n")
	writeQP(&buf, msg.TextBody)
	_, _ = buf.WriteString("\r\n")

	// HTML part
	_, _ = fmt.Fprintf(&buf, "--%s\r\n", boundary)
	_, _ = buf.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	_, _ = buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	_, _ = buf.WriteString("\r\n")
	writeQP(&buf, msg.HTMLBody)
	_, _ = buf.WriteString("\r\n")

	_, _ = fmt.Fprintf(&buf, "--%s--\r\n", boundary)
	return buf.Bytes()
}

// writeQP encodes body as quoted-printable and writes it to buf.
func writeQP(buf *bytes.Buffer, body string) {
	qpw := quotedprintable.NewWriter(buf)
	_, _ = qpw.Write([]byte(body))
	_ = qpw.Close()
}
