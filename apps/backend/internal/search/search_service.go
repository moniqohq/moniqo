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

package search

import (
	"context"
	"fmt"
	"strings"
	"unicode/utf8"

	"go.uber.org/zap"
)

// Service is the business-logic contract for global search.
type Service interface {
	Search(ctx context.Context, budgetID, userID int64, query string, limit int) (Results, error)
}

// Svc is the concrete implementation of Service.
type Svc struct {
	repo Repository
	log  *zap.Logger
}

// NewSvc returns a Svc wired to the given repository.
func NewSvc(repo Repository, log *zap.Logger) *Svc {
	return &Svc{repo: repo, log: log}
}

// clampLimit normalises the requested per-group limit into [1, maxLimit],
// defaulting to defaultLimit when unset or non-positive.
func clampLimit(limit int) int {
	if limit < 1 {
		return defaultLimit
	}
	if limit > maxLimit {
		return maxLimit
	}
	return limit
}

// Search runs a global search across the active budget's financial entities and
// the caller's budgets. The query is trimmed and must be at least minQueryLen
// runes; otherwise ErrValidation is returned. Financial entities are scoped to
// budgetID; budgets are scoped to the caller's memberships via userID.
func (s *Svc) Search(ctx context.Context, budgetID, userID int64, query string, limit int) (Results, error) {
	q := strings.TrimSpace(query)
	if utf8.RuneCountInString(q) < minQueryLen {
		return Results{}, ErrValidation
	}
	lim := clampLimit(limit)

	s.log.Debug("running global search",
		zap.Int64("budget_id", budgetID),
		zap.Int64("user_id", userID),
		zap.Int("limit", lim),
	)

	txns, err := s.repo.SearchTransactions(ctx, budgetID, q, lim)
	if err != nil {
		return Results{}, fmt.Errorf("search transactions: %w", err)
	}
	accounts, err := s.repo.SearchAccounts(ctx, budgetID, q, lim)
	if err != nil {
		return Results{}, fmt.Errorf("search accounts: %w", err)
	}
	envelopes, err := s.repo.SearchEnvelopes(ctx, budgetID, q, lim)
	if err != nil {
		return Results{}, fmt.Errorf("search envelopes: %w", err)
	}
	budgets, err := s.repo.SearchBudgets(ctx, userID, q, lim)
	if err != nil {
		return Results{}, fmt.Errorf("search budgets: %w", err)
	}

	return Results{
		Transactions: txns,
		Accounts:     accounts,
		Envelopes:    envelopes,
		Budgets:      budgets,
	}, nil
}
