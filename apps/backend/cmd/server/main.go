package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echolog "github.com/labstack/echo/v4/middleware"
	"github.com/pressly/goose/v3"

	"github.com/moniqohq/moniqo/apps/backend/internal/config"
	appmw "github.com/moniqohq/moniqo/apps/backend/internal/middleware"
	"github.com/moniqohq/moniqo/apps/backend/internal/user"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	if err := runMigrations(cfg.DatabaseURL); err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	e := echo.New()
	e.HideBanner = true
	e.Use(appmw.Recover())
	e.Use(echolog.RequestID())
	e.Use(echolog.Logger())

	repo := user.NewRepo(pool)
	svc := user.NewService(repo, cfg.BcryptCost)
	h := user.NewHandler(svc)

	reg := e.Group("/api/v1/users")
	reg.Use(appmw.RegisterRateLimiter())
	reg.POST("", h.Register)

	addr := fmt.Sprintf(":%s", cfg.Port)
	slog.Info("starting server", "addr", addr)
	if err := e.Start(addr); err != nil {
		slog.Error("server stopped", "error", err)
	}
}

func runMigrations(dsn string) error {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return err
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	return goose.Up(db, "db/migrations")
}
