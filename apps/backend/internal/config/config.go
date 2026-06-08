package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port        string
	DatabaseURL string
	BcryptCost  int
	Env         string // "development" | "staging" | "production"
	LogLevel    string // "debug" | "info" | "warn" | "error"
}

func Load() Config {
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

	return Config{
		Port:        port,
		DatabaseURL: os.Getenv("DATABASE_URL"),
		BcryptCost:  cost,
		Env:         env,
		LogLevel:    logLevel,
	}
}
