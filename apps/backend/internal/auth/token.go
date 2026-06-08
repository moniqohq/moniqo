package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const issuer = "moniqo"

// contextKey is a private type to prevent collisions with other packages.
type contextKey string

const claimsKey contextKey = "auth_claims"

// Claims is the JWT payload for Moniqo access tokens.
type Claims struct {
	jwt.RegisteredClaims
}

// GenerateAccessToken mints a signed JWT for the given user ID and returns
// the token string alongside the full claims (which carry the jti).
func GenerateAccessToken(userID int64, secret []byte, ttl time.Duration) (string, *Claims, error) {
	now := time.Now()
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", userID),
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    issuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(secret)
	if err != nil {
		return "", nil, err
	}
	return signed, claims, nil
}

// ParseAccessToken validates a JWT string and returns the embedded claims.
func ParseAccessToken(tokenString string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&Claims{},
		func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return secret, nil
		},
		jwt.WithIssuer(issuer),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, fmt.Errorf("invalid claims type")
	}
	return claims, nil
}
