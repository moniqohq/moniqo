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

package apple

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// clientSecretTTL is deliberately short — Apple allows up to 6 months, but
// Moniqo mints a fresh client secret for every token exchange, so there is
// no benefit to a long lifetime and a short one limits exposure if logged.
const clientSecretTTL = 5 * time.Minute

const appleAudience = "https://appleid.apple.com"

// buildClientSecret mints Apple's "client secret", which is not a static
// value but a short-lived ES256-signed JWT identifying the app (client_id),
// the Apple Developer team (team_id), and the specific private key (key_id).
func buildClientSecret(cfg Config) (string, error) {
	key, err := jwt.ParseECPrivateKeyFromPEM([]byte(cfg.PrivateKey))
	if err != nil {
		return "", fmt.Errorf("parse apple private key: %w", err)
	}

	now := time.Now()
	claims := jwt.RegisteredClaims{
		Issuer:    cfg.TeamID,
		Subject:   cfg.ClientID,
		Audience:  jwt.ClaimStrings{appleAudience},
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(clientSecretTTL)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodES256, claims)
	token.Header["kid"] = cfg.KeyID

	signed, err := token.SignedString(key)
	if err != nil {
		return "", fmt.Errorf("sign apple client secret: %w", err)
	}
	return signed, nil
}
