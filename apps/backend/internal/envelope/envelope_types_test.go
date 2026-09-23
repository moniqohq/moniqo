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

package envelope

import (
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

// ---------------------------------------------------------------------------
// TestValidNature
// ---------------------------------------------------------------------------

func TestValidNature(t *testing.T) {
	t.Parallel()

	for _, v := range []string{"want", "should", "need", "must"} {
		t.Run("valid nature: "+v, func(t *testing.T) {
			t.Parallel()
			assert.True(t, validNature(v))
		})
	}

	t.Run("wrong case is rejected", func(t *testing.T) {
		t.Parallel()
		assert.False(t, validNature("Need"))
	})

	t.Run("unknown value is rejected", func(t *testing.T) {
		t.Parallel()
		assert.False(t, validNature("urgent"))
	})

	t.Run("empty string is rejected", func(t *testing.T) {
		t.Parallel()
		assert.False(t, validNature(""))
	})
}

// ---------------------------------------------------------------------------
// TestAllocatedBelowSpentError
// ---------------------------------------------------------------------------

func TestAllocatedBelowSpentError(t *testing.T) {
	t.Parallel()

	err := &AllocatedBelowSpentError{
		Allocated: money.FromMinorUnits(2000),
		Spent:     money.FromMinorUnits(4500),
	}

	t.Run("Error message names both amounts", func(t *testing.T) {
		t.Parallel()
		assert.Equal(t, "cannot be less than the 45.00 already spent (got 20.00)", err.Error())
	})

	t.Run("errors.Is matches the ErrValidation sentinel", func(t *testing.T) {
		t.Parallel()
		assert.ErrorIs(t, err, ErrValidation)
	})

	t.Run("errors.As recovers the concrete type and its fields", func(t *testing.T) {
		t.Parallel()
		var target *AllocatedBelowSpentError
		require := assert.New(t)
		require.True(errors.As(error(err), &target))
		require.Equal(money.FromMinorUnits(2000), target.Allocated)
		require.Equal(money.FromMinorUnits(4500), target.Spent)
	})
}
