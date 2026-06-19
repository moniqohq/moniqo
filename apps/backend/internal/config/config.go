package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	BcryptCost        int
	Env               string // "development" | "staging" | "production"
	LogLevel          string // "debug" | "info" | "warn" | "error"
	JWTSecret         string
	AccessTokenTTL    time.Duration
	RefreshTokenTTL   time.Duration
	RefreshTokenMaxAge time.Duration
	AppBaseURL        string
	Email             EmailConfig
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

	refreshTTL := 168 * time.Hour // 7d
	if v := os.Getenv("REFRESH_TOKEN_TTL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			refreshTTL = d
		}
	}

	refreshMaxAge := 720 * time.Hour // 30d
	if v := os.Getenv("REFRESH_TOKEN_MAX_AGE"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			refreshMaxAge = d
		}
	}

	appBaseURL := os.Getenv("APP_BASE_URL")
	if appBaseURL == "" {
		appBaseURL = "http://localhost:3000"
	}

	emailProvider := os.Getenv("EMAIL_PROVIDER")
	if emailProvider == "" {
		if env == "development" {
			emailProvider = "noop"
		} else {
			emailProvider = "smtp"
		}
	}

	fromName := os.Getenv("EMAIL_FROM_NAME")
	if fromName == "" {
		fromName = "Moniqo"
	}

	smtpPort := 587
	if v := os.Getenv("EMAIL_SMTP_PORT"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			smtpPort = n
		}
	}

	workerInterval := 5 * time.Second
	if v := os.Getenv("EMAIL_WORKER_INTERVAL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			workerInterval = d
		}
	}

	workerBatch := int32(10)
	if v := os.Getenv("EMAIL_WORKER_BATCH"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			workerBatch = int32(n)
		}
	}

	baseBackoff := 30 * time.Second
	if v := os.Getenv("EMAIL_BASE_BACKOFF"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 {
			baseBackoff = d
		}
	}

	return Config{
		Port:               port,
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		BcryptCost:         cost,
		Env:                env,
		LogLevel:           logLevel,
		JWTSecret:          os.Getenv("JWT_SECRET"),
		AccessTokenTTL:     ttl,
		RefreshTokenTTL:    refreshTTL,
		RefreshTokenMaxAge: refreshMaxAge,
		AppBaseURL:         appBaseURL,
		Email: EmailConfig{
			Provider:       emailProvider,
			FromAddress:    os.Getenv("EMAIL_FROM_ADDRESS"),
			FromName:       fromName,
			SMTPHost:       os.Getenv("EMAIL_SMTP_HOST"),
			SMTPPort:       smtpPort,
			SMTPUser:       os.Getenv("EMAIL_SMTP_USER"),
			SMTPPassword:   os.Getenv("EMAIL_SMTP_PASSWORD"),
			WorkerInterval: workerInterval,
			WorkerBatch:    workerBatch,
			BaseBackoff:    baseBackoff,
		},
	}
}
