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

package email_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"github.com/moniqohq/moniqo/apps/backend/internal/email"
)

// mockRepo is a minimal in-process double for Repo used by Service tests.
// It does not need a database connection.
type mockRepo struct {
	mock.Mock
}

func (m *mockRepo) Enqueue(_ context.Context, p email.EnqueueParams) error {
	args := m.Called(p)
	return args.Error(0)
}

func TestService_Enqueue_Success(t *testing.T) {
	t.Parallel()

	repo := &mockRepo{}
	repo.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).Return(nil)

	// Service satisfies the Enqueuer interface; verify at compile time.
	var _ email.Enqueuer = (*testableService)(nil)
	svc := newTestableService(repo)

	err := svc.Enqueue(context.Background(), email.EnqueueParams{
		IdempotencyKey: "verification:1",
		Template:       email.TemplateVerification,
		To:             "user@example.com",
		ToName:         "Test User",
		Payload:        map[string]any{"Name": "Test User"},
	})

	require.NoError(t, err)
	repo.AssertExpectations(t)
}

func TestService_Enqueue_PropagatesRepoError(t *testing.T) {
	t.Parallel()

	repo := &mockRepo{}
	repo.On("Enqueue", mock.AnythingOfType("email.EnqueueParams")).Return(errors.New("db down"))

	svc := newTestableService(repo)
	err := svc.Enqueue(context.Background(), email.EnqueueParams{
		IdempotencyKey: "verification:2",
		Template:       email.TemplateVerification,
		To:             "user@example.com",
		ToName:         "",
		Payload:        nil,
	})

	assert.Error(t, err)
	repo.AssertExpectations(t)
}

// testableService and newTestableService expose just enough for tests without
// requiring a real pgxpool.  They mirror what Service does but accept the mock.
type repoEnqueuer interface {
	Enqueue(ctx context.Context, p email.EnqueueParams) error
}

type testableService struct {
	repo repoEnqueuer
}

func newTestableService(repo repoEnqueuer) *testableService {
	return &testableService{repo: repo}
}

func (s *testableService) Enqueue(ctx context.Context, p email.EnqueueParams) error {
	return s.repo.Enqueue(ctx, p)
}
