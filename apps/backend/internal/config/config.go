package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DatabaseURL    string
	BcryptCost     int
	Env            string // "development" | "staging" | "production"
	LogLevel       string // "debug" | "info" | "warn" | "error"
	JWTSecret      string
	AccessTokenTTL time.Duration
}

func Load() Config {
	_ = godotenv.Load("../../.env")

	cost := 12
	if v := os.Getenv("BCRYPT_COST"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 4 && n <= 31 {
			cost = n
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "production"
	}

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		logLevel = "info"
	}

	ttl := 15 * time.Minute
	if v := os.Getenv("ACCESS_TOKEN_TTL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			ttl = d
		}
	}

	return Config{
		Port:           port,
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		BcryptCost:     cost,
		Env:            env,
		LogLevel:       logLevel,
		JWTSecret:      os.Getenv("JWT_SECRET"),
		AccessTokenTTL: ttl,
	}
}
