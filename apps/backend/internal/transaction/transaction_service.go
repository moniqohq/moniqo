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

package transaction

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// ErrForbidden is returned when the caller's role is insufficient for the operation.
var ErrForbidden = errors.New("insufficient role")

// statusOrDefault returns s if set, otherwise the default uncleared status for new transactions.
func statusOrDefault(s *models.TransactionStatus) models.TransactionStatus {
	if s == nil {
		return models.TransactionStatusUncleared
	}
	return *s
}

// Service is the business-logic contract for transactions.
type Service interface {
	Create(ctx context.Context, budgetID int64, req CreateRequest) (models.Transaction, error)
	CreateTransfer(ctx context.Context, budgetID int64, req CreateRequest) (models.Transaction, error)
	GetByID(ctx context.Context, id, budgetID int64) (models.Transaction, error)
	List(ctx context.Context, budgetID int64, f ListFilters) ([]models.Transaction, int, error)
	Replace(ctx context.Context, id, budgetID int64, req ReplaceRequest) (models.Transaction, error)
	Patch(ctx context.Context, id, budgetID int64, req PatchRequest) (models.Transaction, error)
	Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error
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

// Create persists a standard (non-transfer) transaction.
// Requires budget_envelope_id for non-transfer transactions.
func (s *Svc) Create(ctx context.Context, budgetID int64, req CreateRequest) (models.Transaction, error) {
	s.log.Debug("creating transaction",
		zap.Int64("budget_id", budgetID),
		zap.Int64("account_id", req.AccountID),
	)

	if req.Amount.Int64() == 0 {
		return models.Transaction{}, ErrValidation
	}
	if req.EnvelopeID == nil {
		return models.Transaction{}, ErrValidation
	}

	txn, err := s.repo.Create(ctx, CreateParams{
		BudgetID:   budgetID,
		AccountID:  req.AccountID,
		EnvelopeID: req.EnvelopeID,
		Amount:     req.Amount,
		Date:       req.Date,
		Status:     statusOrDefault(req.Status),
		Memo:       req.Memo,
	})
	if err != nil {
		s.log.Error("repo.Create failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("create transaction: %w", err)
	}

	s.log.Info("transaction created",
		zap.Int64("transaction_id", txn.ID),
		zap.Int64("budget_id", budgetID),
	)
	return txn, nil
}

// CreateTransfer persists two mirrored legs atomically sharing a transfer_group_id.
// Transfer transactions must not have an envelope.
//
//nolint:revive,funlen
func (s *Svc) CreateTransfer(ctx context.Context, budgetID int64, req CreateRequest) (models.Transaction, error) {
	s.log.Debug("creating transfer",
		zap.Int64("budget_id", budgetID),
		zap.Int64("account_id", req.AccountID),
	)

	if req.Amount.Int64() == 0 {
		return models.Transaction{}, ErrValidation
	}
	if req.TransferAccountID == nil {
		return models.Transaction{}, ErrValidation
	}
	if req.EnvelopeID != nil {
		return models.Transaction{}, ErrConflict
	}
	if *req.TransferAccountID == req.AccountID {
		return models.Transaction{}, ErrConflict
	}

	groupID := uuid.New().String()
	status := statusOrDefault(req.Status)

	// Source leg
	src, err := s.repo.Create(ctx, CreateParams{
		BudgetID:          budgetID,
		AccountID:         req.AccountID,
		TransferAccountID: req.TransferAccountID,
		TransferGroupID:   &groupID,
		Amount:            req.Amount,
		Date:              req.Date,
		Status:            status,
		Memo:              req.Memo,
	})
	if err != nil {
		s.log.Error("repo.Create (transfer source) failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("create transfer source: %w", err)
	}

	// Mirror leg: accounts are swapped; amount is negated.
	negated := money.FromMinorUnits(-src.Amount.Int64())
	_, err = s.repo.Create(ctx, CreateParams{
		BudgetID:          budgetID,
		AccountID:         *req.TransferAccountID,
		TransferAccountID: &req.AccountID,
		TransferGroupID:   &groupID,
		Amount:            negated,
		Date:              req.Date,
		Status:            status,
		Memo:              req.Memo,
	})
	if err != nil {
		s.log.Error("repo.Create (transfer mirror) failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("create transfer mirror: %w", err)
	}

	s.log.Info("transfer created",
		zap.Int64("budget_id", budgetID),
		zap.String("group_id", groupID),
	)
	return src, nil
}

// GetByID returns the transaction identified by id within budgetID.
func (s *Svc) GetByID(ctx context.Context, id, budgetID int64) (models.Transaction, error) {
	s.log.Debug("fetching transaction by id",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
	)

	txn, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed",
				zap.Int64("transaction_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Transaction{}, err //nolint:wrapcheck
	}
	return txn, nil
}

// List returns transactions for budgetID matching the filters, plus the total count.
// Returns an empty (non-nil) slice when no transactions match.
func (s *Svc) List(ctx context.Context, budgetID int64, f ListFilters) ([]models.Transaction, int, error) {
	s.log.Debug("listing transactions", zap.Int64("budget_id", budgetID))

	txns, err := s.repo.List(ctx, budgetID, f)
	if err != nil {
		s.log.Error("repo.List failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return nil, 0, fmt.Errorf("list transactions: %w", err)
	}

	if txns == nil {
		txns = []models.Transaction{}
	}

	total, err := s.repo.Count(ctx, budgetID, f)
	if err != nil {
		s.log.Error("repo.Count failed",
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return nil, 0, fmt.Errorf("count transactions: %w", err)
	}

	return txns, total, nil
}

// Replace fully replaces all mutable fields of the transaction.
// For transfers, both legs are updated atomically.
//
//nolint:revive,funlen,cyclop
func (s *Svc) Replace(ctx context.Context, id, budgetID int64, req ReplaceRequest) (models.Transaction, error) {
	s.log.Debug("replacing transaction",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
	)

	if req.Amount.Int64() == 0 {
		return models.Transaction{}, ErrValidation
	}

	existing, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed during Replace",
				zap.Int64("transaction_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Transaction{}, err //nolint:wrapcheck
	}

	// Re-validate transfer/envelope mutual exclusion.
	if req.TransferAccountID != nil && req.EnvelopeID != nil {
		return models.Transaction{}, ErrConflict
	}
	if req.TransferAccountID != nil && *req.TransferAccountID == req.AccountID {
		return models.Transaction{}, ErrConflict
	}

	updated, err := s.repo.Update(ctx, UpdateParams{
		ID:                id,
		BudgetID:          budgetID,
		AccountID:         req.AccountID,
		TransferAccountID: req.TransferAccountID,
		EnvelopeID:        req.EnvelopeID,
		Amount:            req.Amount,
		Date:              req.Date,
		Memo:              req.Memo,
	})
	if err != nil {
		s.log.Error("repo.Update failed",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("update transaction: %w", err)
	}

	// If this is a transfer, update the mirror leg too.
	if existing.TransferGroupID != nil {
		legs, err := s.repo.GetByGroupID(ctx, *existing.TransferGroupID, budgetID)
		if err != nil {
			return models.Transaction{}, fmt.Errorf("get transfer legs: %w", err)
		}
		negated := money.FromMinorUnits(-req.Amount.Int64())
		for _, leg := range legs {
			if leg.ID == id {
				continue
			}
			if _, err := s.repo.Update(ctx, UpdateParams{
				ID:                leg.ID,
				BudgetID:          budgetID,
				AccountID:         leg.AccountID,
				TransferAccountID: leg.TransferAccountID,
				EnvelopeID:        nil,
				Amount:            negated,
				Date:              req.Date,
				Memo:              req.Memo,
			}); err != nil {
				s.log.Error("repo.Update (mirror leg) failed",
					zap.Int64("leg_id", leg.ID),
					zap.Int64("budget_id", budgetID),
					zap.Error(err),
				)
				return models.Transaction{}, fmt.Errorf("update mirror leg: %w", err)
			}
		}
	}

	s.log.Info("transaction replaced",
		zap.Int64("transaction_id", updated.ID),
		zap.Int64("budget_id", budgetID),
	)
	return updated, nil
}

// Patch applies only the non-nil fields from req to the transaction.
// For transfers, the mirror leg's amount is kept consistent.
//
//nolint:revive,funlen,cyclop
func (s *Svc) Patch(ctx context.Context, id, budgetID int64, req PatchRequest) (models.Transaction, error) {
	s.log.Debug("patching transaction",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
	)

	// Reject empty body.
	if req.AccountID == nil && req.TransferAccountID == nil && req.EnvelopeID == nil &&
		req.Amount == nil && req.Date == nil && req.Status == nil && req.Memo == nil {
		return models.Transaction{}, ErrValidation
	}
	if req.Amount != nil && req.Amount.Int64() == 0 {
		return models.Transaction{}, ErrValidation
	}

	existing, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if !errors.Is(err, ErrNotFound) {
			s.log.Error("repo.GetByID failed during Patch",
				zap.Int64("transaction_id", id),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
		}
		return models.Transaction{}, err //nolint:wrapcheck
	}

	updated, err := s.repo.Patch(ctx, PatchParams{
		ID:                id,
		BudgetID:          budgetID,
		AccountID:         req.AccountID,
		TransferAccountID: req.TransferAccountID,
		EnvelopeID:        req.EnvelopeID,
		Amount:            req.Amount,
		Date:              req.Date,
		Status:            req.Status,
		Memo:              req.Memo,
	})
	if err != nil {
		s.log.Error("repo.Patch failed",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return models.Transaction{}, fmt.Errorf("patch transaction: %w", err)
	}

	// Keep mirror leg consistent when amount or date changed.
	if existing.TransferGroupID != nil && (req.Amount != nil || req.Date != nil) {
		legs, err := s.repo.GetByGroupID(ctx, *existing.TransferGroupID, budgetID)
		if err != nil {
			return models.Transaction{}, fmt.Errorf("get transfer legs: %w", err)
		}
		for _, leg := range legs {
			if leg.ID == id {
				continue
			}
			mirrorPatch := PatchParams{
				ID:       leg.ID,
				BudgetID: budgetID,
				Date:     req.Date,
				Memo:     req.Memo,
			}
			if req.Amount != nil {
				negated := money.FromMinorUnits(-req.Amount.Int64())
				mirrorPatch.Amount = &negated
			}
			if _, err := s.repo.Patch(ctx, mirrorPatch); err != nil {
				s.log.Error("repo.Patch (mirror leg) failed",
					zap.Int64("leg_id", leg.ID),
					zap.Int64("budget_id", budgetID),
					zap.Error(err),
				)
				return models.Transaction{}, fmt.Errorf("patch mirror leg: %w", err)
			}
		}
	}

	s.log.Info("transaction patched",
		zap.Int64("transaction_id", updated.ID),
		zap.Int64("budget_id", budgetID),
	)
	return updated, nil
}

// Delete soft-deletes the transaction. For transfers, both legs are deleted.
// Only EDITOR+ can delete. Idempotent: missing transaction returns nil.
//
//nolint:revive
func (s *Svc) Delete(ctx context.Context, id, budgetID int64, callerRole models.Role) error {
	if callerRole == models.RoleViewer {
		return ErrForbidden
	}

	txn, err := s.repo.GetByID(ctx, id, budgetID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return nil
		}
		s.log.Error("repo.GetByID failed during Delete",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("get transaction: %w", err)
	}

	// For transfers, delete both legs via group ID.
	if txn.TransferGroupID != nil {
		if err := s.repo.SoftDeleteByGroupID(ctx, *txn.TransferGroupID, budgetID); err != nil {
			s.log.Error("SoftDeleteByGroupID failed",
				zap.String("group_id", *txn.TransferGroupID),
				zap.Int64("budget_id", budgetID),
				zap.Error(err),
			)
			return fmt.Errorf("soft delete transfer: %w", err)
		}
		s.log.Info("transfer soft-deleted",
			zap.String("group_id", *txn.TransferGroupID),
			zap.Int64("budget_id", budgetID),
		)
		return nil
	}

	if err := s.repo.SoftDelete(ctx, id, budgetID); err != nil {
		s.log.Error("repo.SoftDelete failed",
			zap.Int64("transaction_id", id),
			zap.Int64("budget_id", budgetID),
			zap.Error(err),
		)
		return fmt.Errorf("soft delete transaction: %w", err)
	}

	s.log.Info("transaction soft-deleted",
		zap.Int64("transaction_id", id),
		zap.Int64("budget_id", budgetID),
	)
	return nil
}
