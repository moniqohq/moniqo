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

package money_test

import (
	"strconv"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

func TestAmount_MarshalJSON(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		in   int64
		want string
	}{
		{"zero", 0, "0.00"},
		{"one cent", 1, "0.01"},
		{"negative one cent", -1, "-0.01"},
		{"negative fifty cents", -50, "-0.50"},
		{"negative ninety-nine cents", -99, "-0.99"},
		{"one unit", 100, "1.00"},
		{"negative one unit", -100, "-1.00"},
		{"large positive", 1000000, "10000.00"},
		{"large negative", -1000000, "-10000.00"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			b, err := money.FromMinorUnits(tc.in).MarshalJSON()
			require.NoError(t, err)
			assert.Equal(t, tc.want, string(b))
		})
	}
}

func TestAmount_UnmarshalJSON(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name string
		in   string
		want int64
	}{
		{"bare integer", "10000", 1000000},
		{"one decimal digit", "10000.5", 1000050},
		{"two decimal digits", "10000.50", 1000050},
		{"three decimal digits truncated", "10000.567", 1000056},
		{"negative integer", "-100", -10000},
		{"negative decimal", "-0.50", -50},
		{"zero", "0", 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			var a money.Amount
			require.NoError(t, a.UnmarshalJSON([]byte(tc.in)))
			assert.Equal(t, tc.want, a.Int64())
		})
	}

	t.Run("rejects JSON strings", func(t *testing.T) {
		t.Parallel()
		var a money.Amount
		err := a.UnmarshalJSON([]byte(`"10000"`))
		assert.Error(t, err)
	})
}

func TestAmount_RoundTrip(t *testing.T) {
	t.Parallel()

	for _, v := range []int64{0, 1, -1, -50, -99, 100, -100, 1000000, -1000000} {
		t.Run(strconv.FormatInt(v, 10), func(t *testing.T) {
			t.Parallel()
			b, err := money.FromMinorUnits(v).MarshalJSON()
			require.NoError(t, err)

			var a money.Amount
			require.NoError(t, a.UnmarshalJSON(b))
			assert.Equal(t, v, a.Int64())
		})
	}
}
