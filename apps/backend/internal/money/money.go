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

// Package money provides a fixed-point monetary amount type that stores values
// as int64 minor units (e.g. cents) and marshals/unmarshals as decimal JSON numbers.
package money

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

const (
	minorUnitFactor = 100 // 1 major unit = 100 minor units (2 decimal places)
	decimalPlaces   = 2
)

// Amount represents a monetary value as an int64 count of minor units (cents).
// For example, Amount(10000) represents 100.00 in the base currency.
// Two decimal places of precision are assumed throughout.
type Amount int64

// FromMinorUnits constructs an Amount directly from a minor-unit integer value.
func FromMinorUnits(v int64) Amount {
	return Amount(v)
}

// Int64 returns the underlying minor-unit integer value.
func (a Amount) Int64() int64 {
	return int64(a)
}

// MarshalJSON encodes the amount as a JSON number with exactly two decimal places.
// For example, Amount(1000000) encodes as 10000.00.
func (a Amount) MarshalJSON() ([]byte, error) {
	v := int64(a)
	whole := v / minorUnitFactor
	frac := v % minorUnitFactor
	if frac < 0 {
		frac = -frac
	}
	return []byte(fmt.Sprintf("%d.%02d", whole, frac)), nil
}

// UnmarshalJSON decodes a JSON number (integer or decimal) into minor units.
// For example, 10000.00 or 10000 both decode to Amount(1000000).
// Negative values are allowed (e.g. outflow transactions use negative amounts).
//
//nolint:revive,cyclop
func (a *Amount) UnmarshalJSON(b []byte) error {
	s := strings.TrimSpace(string(b))

	// Reject JSON strings — we only accept bare numbers.
	if strings.HasPrefix(s, `"`) {
		return errors.New("money: amount must be a JSON number, got string")
	}

	negative := strings.HasPrefix(s, "-")
	if negative {
		s = s[1:]
	}

	parts := strings.SplitN(s, ".", decimalPlaces)
	var minor int64
	switch len(parts) {
	case 1:
		// Integer input, e.g. "10000".
		whole, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return fmt.Errorf("money: invalid amount: %w", err)
		}
		minor = whole * minorUnitFactor

	case decimalPlaces:
		// Decimal input, e.g. "10000.50" or "10000.5".
		whole, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return fmt.Errorf("money: invalid amount: %w", err)
		}

		fracStr := parts[1]
		// Pad or truncate to exactly 2 digits.
		switch len(fracStr) {
		case 0:
			fracStr = "00"
		case 1:
			fracStr += "0"
		default:
			fracStr = fracStr[:decimalPlaces]
		}

		frac, err := strconv.ParseInt(fracStr, 10, 64)
		if err != nil {
			return fmt.Errorf("money: invalid amount: %w", err)
		}

		minor = whole*minorUnitFactor + frac

	default:
		return fmt.Errorf("money: invalid amount %q", s)
	}

	if negative {
		minor = -minor
	}
	*a = Amount(minor)
	return nil
}
