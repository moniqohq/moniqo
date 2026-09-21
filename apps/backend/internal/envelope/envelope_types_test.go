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
	"testing"

	"github.com/stretchr/testify/assert"
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
