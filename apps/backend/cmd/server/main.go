package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"github.com/pressly/goose/v3"
	"go.uber.org/zap"

	"github.com/moniqohq/moniqo/apps/backend/db/migrations"
	"github.com/moniqohq/moniqo/apps/backend/internal/config"
	"github.com/moniqohq/moniqo/apps/backend/internal/logger"
	appmw "github.com/moniqohq/moniqo/apps/backend/internal/middleware"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

func main() {
	cfg := config.Load()

	log, err := logger.New(logger.Config{
		Level:       cfg.LogLevel,
		Development: cfg.Env == "development",
		ServiceName: "moniqo-api",
		Env:         cfg.Env,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to initialize logger: %v\n", err)
		os.Exit(1)
	}
	defer log.Sync() //nolint:errcheck

	if cfg.DatabaseURL == "" {
		log.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	if err := runMigrations(cfg.DatabaseURL); err != nil {
		log.Error("migration failed", zap.Error(err))
		os.Exit(1)
	}

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Error("failed to connect to database", zap.Error(err))
		os.Exit(1)
	}
	defer pool.Close()

	e := echo.New()
	e.HideBanner = true
	e.Use(echomw.RequestID())
	e.Use(appmw.Recover(log))
	e.Use(appmw.RequestLogger(log))

	auth := e.Group("/api/v1/auth")
	auth.Use(appmw.RegisterRateLimiter())

	repo := user.NewRepo(pool, log)
	svc := user.NewService(repo, cfg.BcryptCost, log)
	h := user.NewHandler(svc, log)

	reg := e.Group("/api/v1")
	reg.Use(appmw.RegisterRateLimiter())
	reg.POST("/users", h.Register)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Info("starting server", zap.String("addr", addr))
	if err := e.Start(addr); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Error("server error", zap.Error(err))
		os.Exit(1)
	}
}

func runMigrations(dsn string) error {
	conn, err := sql.Open("pgx", dsn)
	if err != nil {
		return err
	}
	defer conn.Close()

	goose.SetBaseFS(migrations.Migrations)
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.Up(conn, ".")
}
