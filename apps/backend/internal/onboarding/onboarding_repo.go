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

package onboarding

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"go.uber.org/zap"

	db "github.com/moniqohq/moniqo/apps/backend/db/generated"
	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

// Repository defines the data-access contract for onboarding progress and the
// two profile fields (currency/timezone) it writes onto the users table.
type Repository interface {
	GetOrCreate(ctx context.Context, userID int64) (models.OnboardingProgress, error)
	CompleteStep(ctx context.Context, userID int64, step int16, budgetID *int64) (models.OnboardingProgress, error)
	SaveIncomeSources(ctx context.Context, userID int64, sources []IncomeSource) (models.OnboardingProgress, error)
	Complete(ctx context.Context, userID int64) error
	UpdateProfile(ctx context.Context, userID int64, name *string, currency, timezone string) (models.User, error)
}

// Repo is the sqlc-backed implementation of Repository.
type Repo struct {
	pool *pgxpool.Pool
	log  *zap.Logger
}

// NewRepo returns a Repo backed by the given connection pool.
func NewRepo(pool *pgxpool.Pool, log *zap.Logger) *Repo {
	return &Repo{pool: pool, log: log}
}

// toModel converts a db.OnboardingProgress row into a models.OnboardingProgress,
// decoding draft_payload's income_sources array. A malformed payload degrades to
// an empty slice rather than failing the read — draft_payload is scratch state.
func toModel(row db.OnboardingProgress) models.OnboardingProgress {
	var completedAt *time.Time
	if row.CompletedAt.Valid {
		t := row.CompletedAt.Time
		completedAt = &t
	}

	var draft draftPayload
	_ = json.Unmarshal(row.DraftPayload, &draft) //nolint:errcheck

	return models.OnboardingProgress{
		UserID:         row.UserID,
		CurrentStep:    row.CurrentStep,
		CompletedSteps: row.CompletedSteps,
		BudgetID:       row.BudgetID,
		IncomeSources:  draft.IncomeSources,
		Status:         row.Status,
		StartedAt:      row.StartedAt.Time,
		CompletedAt:    completedAt,
	}
}

// draftPayload is the shape stored in onboarding_progress.draft_payload.
type draftPayload struct {
	IncomeSources []IncomeSource `json:"income_sources"`
}

// GetOrCreate returns the caller's onboarding progress row, creating one on
// first access so every authenticated user has exactly one row.
func (r *Repo) GetOrCreate(ctx context.Context, userID int64) (models.OnboardingProgress, error) {
	q := db.New(r.pool)

	r.log.Debug("executing GetOnboardingProgress query", zap.Int64("user_id", userID))
	row, err := q.GetOnboardingProgress(ctx, userID)
	if err == nil {
		return toModel(row), nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		r.log.Error("GetOnboardingProgress query failed", zap.Int64("user_id", userID), zap.Error(err))
		return models.OnboardingProgress{}, fmt.Errorf("get onboarding progress: %w", err)
	}

	r.log.Debug("executing CreateOnboardingProgress query", zap.Int64("user_id", userID))
	row, err = q.CreateOnboardingProgress(ctx, userID)
	if err != nil {
		r.log.Error("CreateOnboardingProgress query failed", zap.Int64("user_id", userID), zap.Error(err))
		return models.OnboardingProgress{}, fmt.Errorf("create onboarding progress: %w", err)
	}
	return toModel(row), nil
}

// CompleteStep marks step complete and, if budgetID is non-nil, records it on
// the progress row (used by step 2, the only step that produces a budget_id).
func (r *Repo) CompleteStep(ctx context.Context, userID int64, step int16, budgetID *int64) (models.OnboardingProgress, error) {
	r.log.Debug("executing CompleteOnboardingStep query", zap.Int64("user_id", userID), zap.Int16("step", step))
	q := db.New(r.pool)
	row, err := q.CompleteOnboardingStep(ctx, db.CompleteOnboardingStepParams{
		UserID:   userID,
		Step:     step,
		BudgetID: budgetID,
	})
	if err != nil {
		r.log.Error("CompleteOnboardingStep query failed", zap.Int64("user_id", userID), zap.Error(err))
		return models.OnboardingProgress{}, fmt.Errorf("complete onboarding step: %w", err)
	}
	return toModel(row), nil
}

// SaveIncomeSources fully replaces the draft income-sources list.
func (r *Repo) SaveIncomeSources(ctx context.Context, userID int64, sources []IncomeSource) (models.OnboardingProgress, error) {
	payload, err := json.Marshal(draftPayload{IncomeSources: sources})
	if err != nil {
		return models.OnboardingProgress{}, fmt.Errorf("marshal draft payload: %w", err)
	}

	r.log.Debug("executing UpdateOnboardingDraftPayload query", zap.Int64("user_id", userID))
	q := db.New(r.pool)
	row, err := q.UpdateOnboardingDraftPayload(ctx, db.UpdateOnboardingDraftPayloadParams{
		UserID:       userID,
		DraftPayload: payload,
	})
	if err != nil {
		r.log.Error("UpdateOnboardingDraftPayload query failed", zap.Int64("user_id", userID), zap.Error(err))
		return models.OnboardingProgress{}, fmt.Errorf("update onboarding draft payload: %w", err)
	}
	return toModel(row), nil
}

// Complete marks the progress row completed and stamps users.onboarding_completed_at.
func (r *Repo) Complete(ctx context.Context, userID int64) error {
	q := db.New(r.pool)

	r.log.Debug("executing CompleteOnboarding query", zap.Int64("user_id", userID))
	if err := q.CompleteOnboarding(ctx, userID); err != nil {
		r.log.Error("CompleteOnboarding query failed", zap.Int64("user_id", userID), zap.Error(err))
		return fmt.Errorf("complete onboarding: %w", err)
	}

	r.log.Debug("executing MarkUserOnboardingComplete query", zap.Int64("user_id", userID))
	if err := q.MarkUserOnboardingComplete(ctx, userID); err != nil {
		r.log.Error("MarkUserOnboardingComplete query failed", zap.Int64("user_id", userID), zap.Error(err))
		return fmt.Errorf("mark user onboarding complete: %w", err)
	}
	return nil
}

// UpdateProfile writes name/currency/timezone onto the users row.
func (r *Repo) UpdateProfile(ctx context.Context, userID int64, name *string, currency, timezone string) (models.User, error) {
	r.log.Debug("executing UpdateUserOnboardingProfile query", zap.Int64("user_id", userID))
	q := db.New(r.pool)
	row, err := q.UpdateUserOnboardingProfile(ctx, db.UpdateUserOnboardingProfileParams{
		ID:       userID,
		Currency: &currency,
		Timezone: &timezone,
		Name:     name,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return models.User{}, ErrNotFound
		}
		r.log.Error("UpdateUserOnboardingProfile query failed", zap.Int64("user_id", userID), zap.Error(err))
		return models.User{}, fmt.Errorf("update user onboarding profile: %w", err)
	}

	var lastLogin *time.Time
	if row.LastLogin.Valid {
		t := row.LastLogin.Time
		lastLogin = &t
	}
	var onboardingCompletedAt *time.Time
	if row.OnboardingCompletedAt.Valid {
		t := row.OnboardingCompletedAt.Time
		onboardingCompletedAt = &t
	}
	return models.User{
		ID:                    row.ID,
		Name:                  row.Name,
		Username:              row.Username,
		Email:                 row.Email,
		Picture:               row.Picture,
		Status:                models.UserStatus(row.Status),
		Currency:              row.Currency,
		Timezone:              row.Timezone,
		OnboardingCompletedAt: onboardingCompletedAt,
		LastLogin:             lastLogin,
		CreatedAt:             row.CreatedAt.Time,
	}, nil
}
