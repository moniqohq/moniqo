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

package models_test

import (
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
	"github.com/moniqohq/moniqo/apps/backend/internal/money"
)

func TestAccountType_IsLiability(t *testing.T) {
	t.Parallel()

	assert.True(t, models.AccountTypeCreditCard.IsLiability())
	assert.True(t, models.AccountTypeLoan.IsLiability())
	assert.False(t, models.AccountTypeChecking.IsLiability())
	assert.False(t, models.AccountTypeSavings.IsLiability())
	assert.False(t, models.AccountTypeCash.IsLiability())
}

func TestNetWorth(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		balances []models.TypeBalance
		want     money.Amount
	}{
		{
			name:     "empty budget returns zero",
			balances: nil,
			want:     money.FromMinorUnits(0),
		},
		{
			name: "assets only",
			balances: []models.TypeBalance{
				{Type: models.AccountTypeChecking, Balance: money.FromMinorUnits(50000)},
			},
			want: money.FromMinorUnits(50000),
		},
		{
			name: "liabilities only, net worth goes negative",
			balances: []models.TypeBalance{
				{Type: models.AccountTypeCreditCard, Balance: money.FromMinorUnits(-20000)},
			},
			want: money.FromMinorUnits(-20000),
		},
		{
			name: "assets plus liabilities",
			balances: []models.TypeBalance{
				{Type: models.AccountTypeChecking, Balance: money.FromMinorUnits(50000)},
				{Type: models.AccountTypeCreditCard, Balance: money.FromMinorUnits(-20000)},
			},
			want: money.FromMinorUnits(30000),
		},
		{
			name: "multiple asset accounts",
			balances: []models.TypeBalance{
				{Type: models.AccountTypeChecking, Balance: money.FromMinorUnits(50000)},
				{Type: models.AccountTypeSavings, Balance: money.FromMinorUnits(100000)},
				{Type: models.AccountTypeSavings, Balance: money.FromMinorUnits(200000)},
			},
			want: money.FromMinorUnits(350000),
		},
		{
			name: "multiple liability accounts",
			balances: []models.TypeBalance{
				{Type: models.AccountTypeCreditCard, Balance: money.FromMinorUnits(-20000)},
				{Type: models.AccountTypeLoan, Balance: money.FromMinorUnits(-80000)},
			},
			want: money.FromMinorUnits(-100000),
		},
		{
			name: "checking, savings, credit card, and a loan (realistic scenario)",
			balances: []models.TypeBalance{
				{Type: models.AccountTypeChecking, Balance: money.FromMinorUnits(50000)},
				{Type: models.AccountTypeSavings, Balance: money.FromMinorUnits(100000)},
				{Type: models.AccountTypeSavings, Balance: money.FromMinorUnits(200000)},
				{Type: models.AccountTypeCreditCard, Balance: money.FromMinorUnits(-20000)},
				{Type: models.AccountTypeLoan, Balance: money.FromMinorUnits(-80000)},
			},
			want: money.FromMinorUnits(250000),
		},
		{
			name: "transfer between two asset accounts has zero net-worth impact",
			balances: []models.TypeBalance{
				// Checking -1,000 and Savings +1,000: the two legs of a transfer.
				{Type: models.AccountTypeChecking, Balance: money.FromMinorUnits(-1000)},
				{Type: models.AccountTypeSavings, Balance: money.FromMinorUnits(1000)},
			},
			want: money.FromMinorUnits(0),
		},
		{
			name: "a credit card transaction reduces net worth",
			balances: []models.TypeBalance{
				{Type: models.AccountTypeChecking, Balance: money.FromMinorUnits(50000)},
				// -5,000 spent on the card.
				{Type: models.AccountTypeCreditCard, Balance: money.FromMinorUnits(-5000)},
			},
			want: money.FromMinorUnits(45000),
		},
		{
			name: "overpaid credit card contributes its positive balance as an asset offset",
			balances: []models.TypeBalance{
				{Type: models.AccountTypeChecking, Balance: money.FromMinorUnits(50000)},
				{Type: models.AccountTypeCreditCard, Balance: money.FromMinorUnits(1000)},
			},
			want: money.FromMinorUnits(51000),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			assert.Equal(t, tt.want, models.NetWorth(tt.balances))
		})
	}
}
