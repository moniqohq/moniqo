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

// Package config loads and exposes application configuration from environment variables.
package config

import (
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

const (
	defaultBcryptCost = 12
	defaultSMTPPort   = 587

	defaultAccessTokenTTL              = 15 * time.Minute
	defaultRefreshTokenTTL             = 168 * time.Hour // 7d
	defaultRefreshTokenMaxAge          = 720 * time.Hour // 30d
	defaultPasswordResetTokenTTL       = time.Hour
	defaultWorkerInterval              = 5 * time.Second
	defaultWorkerBatch           int32 = 10
	defaultBaseBackoff                 = 30 * time.Second
)

// Config holds all runtime settings for the backend server.
type Config struct {
	Port                  string
	DatabaseURL           string
	BcryptCost            int
	Env                   string // "development" | "staging" | "production"
	LogLevel              string // "debug" | "info" | "warn" | "error"
	JWTSecret             string
	AccessTokenTTL        time.Duration
	RefreshTokenTTL       time.Duration
	RefreshTokenMaxAge    time.Duration
	PasswordResetTokenTTL time.Duration
	AppBaseURL            string
	CORSOrigins           []string // CORS_ORIGINS comma-separated; defaults to AppBaseURL
	Email                 EmailConfig
}

// EmailConfig groups all email-related settings.
// Provider: "noop" (default in development) or "smtp".
type EmailConfig struct {
	Provider       string        // EMAIL_PROVIDER
	FromAddress    string        // EMAIL_FROM_ADDRESS
	FromName       string        // EMAIL_FROM_NAME
	SMTPHost       string        // EMAIL_SMTP_HOST
	SMTPPort       int           // EMAIL_SMTP_PORT (default 587)
	SMTPUser       string        // EMAIL_SMTP_USER
	SMTPPassword   string        // EMAIL_SMTP_PASSWORD
	WorkerInterval time.Duration // EMAIL_WORKER_INTERVAL (default 5s)
	WorkerBatch    int32         // EMAIL_WORKER_BATCH (default 10)
	BaseBackoff    time.Duration // EMAIL_BASE_BACKOFF (default 30s)
}

// Load reads configuration from environment variables, falling back to sensible
// defaults. It also attempts to load a .env file from the repo root if present.
func Load() Config {
	_ = godotenv.Load("../../.env")

	env := envOrDefault("APP_ENV", "production")

	cost := defaultBcryptCost
	if v := os.Getenv("BCRYPT_COST"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 4 && n <= 31 {
			cost = n
		}
	}

	return Config{
		Port:                  envOrDefault("PORT", "8080"),
		DatabaseURL:           os.Getenv("DATABASE_URL"),
		BcryptCost:            cost,
		Env:                   env,
		LogLevel:              envOrDefault("LOG_LEVEL", "info"),
		JWTSecret:             os.Getenv("JWT_SECRET"),
		AccessTokenTTL:        envDuration("ACCESS_TOKEN_TTL", defaultAccessTokenTTL),
		RefreshTokenTTL:       envDuration("REFRESH_TOKEN_TTL", defaultRefreshTokenTTL),
		RefreshTokenMaxAge:    envDuration("REFRESH_TOKEN_MAX_AGE", defaultRefreshTokenMaxAge),
		PasswordResetTokenTTL: envDuration("PASSWORD_RESET_TOKEN_TTL", defaultPasswordResetTokenTTL),
		AppBaseURL:            envOrDefault("APP_BASE_URL", "http://localhost:3000"),
		CORSOrigins:           corsOrigins(envOrDefault("APP_BASE_URL", "http://localhost:3000")),
		Email:                 loadEmailConfig(env),
	}
}

// corsOrigins returns the list of allowed CORS origins. CORS_ORIGINS env var
// overrides the default (which is the AppBaseURL). Multiple origins are
// comma-separated, e.g. "http://localhost:3000,https://app.moniqo.in".
func corsOrigins(appBaseURL string) []string {
	v := os.Getenv("CORS_ORIGINS")
	if v == "" {
		return []string{appBaseURL}
	}
	var origins []string
	for o := range strings.SplitSeq(v, ",") {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	if len(origins) > 0 {
		return origins
	}
	return []string{appBaseURL}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	if d, err := time.ParseDuration(v); err == nil && d > 0 {
		return d
	}
	return fallback
}

func loadEmailConfig(env string) EmailConfig {
	defaultProvider := "smtp"
	if env == "development" {
		defaultProvider = "noop"
	}

	return EmailConfig{
		Provider:       envOrDefault("EMAIL_PROVIDER", defaultProvider),
		FromAddress:    os.Getenv("EMAIL_FROM_ADDRESS"),
		FromName:       envOrDefault("EMAIL_FROM_NAME", "Moniqo"),
		SMTPHost:       os.Getenv("EMAIL_SMTP_HOST"),
		SMTPPort:       envInt("EMAIL_SMTP_PORT", defaultSMTPPort),
		SMTPUser:       os.Getenv("EMAIL_SMTP_USER"),
		SMTPPassword:   os.Getenv("EMAIL_SMTP_PASSWORD"),
		WorkerInterval: envDuration("EMAIL_WORKER_INTERVAL", defaultWorkerInterval),
		WorkerBatch:    envInt32("EMAIL_WORKER_BATCH", defaultWorkerBatch),
		BaseBackoff:    envDuration("EMAIL_BASE_BACKOFF", defaultBaseBackoff),
	}
}

func envStringSlice(key string, fallback []string) []string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	var result []string
	for _, s := range strings.Split(v, ",") {
		if t := strings.TrimSpace(s); t != "" {
			result = append(result, t)
		}
	}
	if len(result) == 0 {
		return fallback
	}
	return result
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	if n, err := strconv.Atoi(v); err == nil && n > 0 {
		return n
	}
	return fallback
}

func envInt32(key string, fallback int32) int32 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	if n, err := strconv.ParseInt(v, 10, 32); err == nil && n > 0 {
		return int32(n)
	}
	return fallback
}
