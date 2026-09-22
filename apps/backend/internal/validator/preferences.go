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

package validator

import (
	"time"

	"github.com/moniqohq/moniqo/apps/backend/internal/httpx"
)

const (
	errNotEmptyIfProvided = "must not be empty if provided"

	unsupportedCurrencyMsg   = "unsupported currency code (supported: INR, USD, EUR, GBP, AUD, CAD, SGD)"
	unsupportedDateFormatMsg = "unsupported date format (supported: MMM DD, YYYY / DD/MM/YYYY / MM/DD/YYYY / YYYY-MM-DD)"
)

// supportedCurrencies is the allowlist of ISO-4217 codes accepted for a
// user's display currency. Restricted to two-decimal currencies because
// internal/money.Amount hardcodes 2 decimal places for every stored value —
// a zero- or three-decimal currency (e.g. JPY, KWD) would silently
// misrepresent amounts if allowed here.
func supportedCurrencies() map[string]bool {
	return map[string]bool{
		"INR": true,
		"USD": true,
		"EUR": true,
		"GBP": true,
		"AUD": true,
		"CAD": true,
		"SGD": true,
	}
}

// supportedDateFormats is the allowlist of date-format tokens accepted for a
// user's display date format. Must match the users_date_format_check
// database constraint in db/migrations/00021_add_user_date_format.sql.
func supportedDateFormats() map[string]bool {
	return map[string]bool{
		"MMM DD, YYYY": true,
		"DD/MM/YYYY":   true,
		"MM/DD/YYYY":   true,
		"YYYY-MM-DD":   true,
	}
}

// validateCurrencyCode checks a non-empty currency code against the
// supported allowlist.
func validateCurrencyCode(field, currency string) *httpx.FieldError {
	if !supportedCurrencies()[currency] {
		return &httpx.FieldError{Field: field, Error: unsupportedCurrencyMsg}
	}
	return nil
}

// validateTimezoneName checks a non-empty IANA timezone name by attempting
// to load it.
func validateTimezoneName(field, tz string) *httpx.FieldError {
	if _, err := time.LoadLocation(tz); err != nil {
		return &httpx.FieldError{Field: field, Error: "invalid IANA timezone"}
	}
	return nil
}

// validateDateFormatToken checks a non-empty date-format token against the
// supported allowlist.
func validateDateFormatToken(field, df string) *httpx.FieldError {
	if !supportedDateFormats()[df] {
		return &httpx.FieldError{Field: field, Error: unsupportedDateFormatMsg}
	}
	return nil
}

// validateOptionalCurrency validates an optional *string field: nil (absent)
// passes, an explicitly empty string is rejected, and any other value must
// be a supported currency code.
func validateOptionalCurrency(field string, currency *string) *httpx.FieldError {
	if currency == nil {
		return nil
	}
	if *currency == "" {
		return &httpx.FieldError{Field: field, Error: errNotEmptyIfProvided}
	}
	return validateCurrencyCode(field, *currency)
}

// validateOptionalTimezone validates an optional *string field: nil (absent)
// passes, an explicitly empty string is rejected, and any other value must
// be a valid IANA timezone name.
func validateOptionalTimezone(field string, tz *string) *httpx.FieldError {
	if tz == nil {
		return nil
	}
	if *tz == "" {
		return &httpx.FieldError{Field: field, Error: errNotEmptyIfProvided}
	}
	return validateTimezoneName(field, *tz)
}

// validateOptionalDateFormat validates an optional *string field: nil
// (absent) passes, an explicitly empty string is rejected, and any other
// value must be a supported date-format token.
func validateOptionalDateFormat(field string, df *string) *httpx.FieldError {
	if df == nil {
		return nil
	}
	if *df == "" {
		return &httpx.FieldError{Field: field, Error: errNotEmptyIfProvided}
	}
	return validateDateFormatToken(field, *df)
}

// ValidateRequiredCurrency validates a required (non-pointer) currency code,
// used by the onboarding profile step where currency must always be present.
func ValidateRequiredCurrency(field, currency string) *httpx.FieldError {
	if currency == "" {
		return &httpx.FieldError{Field: field, Error: errRequired}
	}
	return validateCurrencyCode(field, currency)
}

// ValidateRequiredTimezone validates a required (non-pointer) IANA timezone
// name, used by the onboarding profile step where timezone must always be
// present.
func ValidateRequiredTimezone(field, tz string) *httpx.FieldError {
	if tz == "" {
		return &httpx.FieldError{Field: field, Error: errRequired}
	}
	return validateTimezoneName(field, tz)
}
