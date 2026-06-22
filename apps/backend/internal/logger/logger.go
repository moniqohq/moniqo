// Package logger provides zap-based structured logger initialization.
package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Config drives logger initialization.
type Config struct {
	// Level is the minimum log level: debug, info, warn, error. Defaults to info.
	Level string
	// Development enables human-readable console output with colorized levels.
	// In production, JSON output is used.
	Development bool
	// ServiceName is attached to every log entry as "service".
	ServiceName string
	// Env is attached to every log entry as "env" (e.g. "production", "staging").
	Env string
}

func parseLevel(s string) zapcore.Level {
	var l zapcore.Level
	if err := l.UnmarshalText([]byte(s)); err != nil {
		return zapcore.InfoLevel
	}
	return l
}

// New builds a *zap.Logger from Config.
// Returns an error only if the underlying zap build fails (effectively never in practice).
func New(cfg Config) (*zap.Logger, error) {
	level := zapcore.InfoLevel
	if cfg.Level != "" {
		level = parseLevel(cfg.Level)
	}

	var zapCfg zap.Config
	if cfg.Development {
		zapCfg = zap.NewDevelopmentConfig()
	} else {
		zapCfg = zap.NewProductionConfig()
		// Always include caller in production for traceability.
		zapCfg.EncoderConfig.TimeKey = "ts"
		zapCfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	}
	zapCfg.Level = zap.NewAtomicLevelAt(level)

	log, err := zapCfg.Build(zap.AddCallerSkip(0))
	if err != nil {
		return nil, err
	}

	const maxStaticFields = 2
	fields := make([]zap.Field, 0, maxStaticFields)
	if cfg.ServiceName != "" {
		fields = append(fields, zap.String("service", cfg.ServiceName))
	}
	if cfg.Env != "" {
		fields = append(fields, zap.String("env", cfg.Env))
	}
	if len(fields) > 0 {
		log = log.With(fields...)
	}

	return log, nil
}
