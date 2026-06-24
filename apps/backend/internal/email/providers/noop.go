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
