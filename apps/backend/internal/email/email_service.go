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

// Service implements Enqueuer by persisting email jobs to PostgreSQL.
type Service struct {
	repo *Repo
}

// NewService returns a Service that enqueues email jobs via repo.
func NewService(repo *Repo) *Service {
	return &Service{repo: repo}
}

// Enqueue persists an email job to PostgreSQL for async delivery.
func (s *Service) Enqueue(ctx context.Context, p EnqueueParams) error {
	return s.repo.Enqueue(ctx, p)
}
