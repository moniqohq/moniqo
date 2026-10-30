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
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"github.com/moniqohq/moniqo/apps/backend/internal/models"
)

func TestDate_MarshalJSON(t *testing.T) {
	t.Parallel()

	d := models.Date{Time: time.Date(2026, time.October, 30, 15, 4, 5, 0, time.UTC)}
	out, err := json.Marshal(struct {
		D models.Date `json:"d"`
	}{D: d})
	require.NoError(t, err)
	require.JSONEq(t, `{"d":"2026-10-30"}`, string(out))
}
