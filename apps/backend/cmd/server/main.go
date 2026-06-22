// Package main is the entry point for the Moniqo backend server.
package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/pressly/goose/v3"
	"go.uber.org/zap"

	_ "github.com/jackc/pgx/v5/stdlib"

	echomw "github.com/labstack/echo/v4/middleware"

	"github.com/moniqohq/moniqo/apps/backend/db/migrations"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/config"
	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	"github.com/moniqohq/moniqo/apps/backend/internal/email/providers"
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

	if err := start(cfg, log); err != nil {
		log.Error("fatal", zap.Error(err))
		_ = log.Sync()
		os.Exit(1)
	}
	_ = log.Sync()
}

func start(cfg config.Config, log *zap.Logger) error {
	if cfg.DatabaseURL == "" {
		return errors.New("DATABASE_URL is required")
	}

	if cfg.JWTSecret == "" {
		return errors.New("JWT_SECRET is required")
	}

	if err := runMigrations(cfg.DatabaseURL); err != nil {
		return fmt.Errorf("migration failed: %w", err)
	}

	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}
	defer pool.Close()

	e := buildServer(cfg, pool, log)
	return run(e, ":"+cfg.Port, log)
}

func run(e *echo.Echo, addr string, log *zap.Logger) error {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	log.Info("starting server", zap.String("addr", addr))

	go func() {
		<-quit
		log.Info("shutting down server")
		if err := e.Shutdown(context.Background()); err != nil {
			log.Error("server shutdown error", zap.Error(err))
		}
	}()

	if err := e.Start(addr); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func buildServer(cfg config.Config, pool *pgxpool.Pool, log *zap.Logger) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.Use(echomw.RequestID())
	e.Use(appmw.Recover(log))
	e.Use(appmw.RequestLogger(log))

	emailSvc, emailWorker := buildEmailSubsystem(cfg, pool, log)
	workerCtx, workerCancel := context.WithCancel(context.Background())
	go emailWorker.Run(workerCtx)
	e.Server.RegisterOnShutdown(func() {
		workerCancel()
		emailWorker.Wait()
	})

	registerRoutes(e, cfg, pool, emailSvc, log)
	return e
}

func buildEmailSubsystem(cfg config.Config, pool *pgxpool.Pool, log *zap.Logger) (*email.Service, *email.Worker) {
	emailRepo := email.NewRepo(pool, log)

	var emailProvider providers.Provider
	if cfg.Email.Provider == "smtp" {
		emailProvider = providers.NewSMTP(providers.SMTPConfig{
			Host:     cfg.Email.SMTPHost,
			Port:     cfg.Email.SMTPPort,
			Username: cfg.Email.SMTPUser,
			Password: cfg.Email.SMTPPassword,
			From:     cfg.Email.FromAddress,
			FromName: cfg.Email.FromName,
		})
	} else {
		emailProvider = providers.NewNoop(log)
	}

	emailSvc := email.NewService(emailRepo)
	emailWorker := email.NewWorker(emailRepo, emailProvider, email.WorkerConfig{
		PollInterval: cfg.Email.WorkerInterval,
		BatchSize:    cfg.Email.WorkerBatch,
		BaseBackoff:  cfg.Email.BaseBackoff,
		FromAddress:  cfg.Email.FromAddress,
		FromName:     cfg.Email.FromName,
	}, log)

	return emailSvc, emailWorker
}

func registerRoutes(e *echo.Echo, cfg config.Config, pool *pgxpool.Pool, emailSvc *email.Service, log *zap.Logger) {
	jwtSecret := []byte(cfg.JWTSecret)

	userRepo := user.NewRepo(pool, log)
	userSvc := user.NewSvc(userRepo, emailSvc, cfg.BcryptCost, cfg.AppBaseURL, jwtSecret, log)
	userHandler := user.NewHandler(userSvc, log)

	authRepo := auth.NewAuthRepo(pool, log)
	authSvc := auth.NewAuthSvc(authRepo, jwtSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL, cfg.RefreshTokenMaxAge, log)
	authHandler := auth.NewHandler(authSvc, log)
	authMW := auth.Middleware(authRepo, jwtSecret, log)

	reg := e.Group("/api/v1")
	reg.Use(appmw.RegisterRateLimiter())
	reg.POST("/users", userHandler.Register)

	loginGroup := e.Group("/api/v1/auth")
	loginGroup.Use(appmw.LoginRateLimiter())
	loginGroup.POST("/login", authHandler.Login)

	logoutGroup := e.Group("/api/v1/auth")
	logoutGroup.Use(authMW)
	logoutGroup.POST("/logout", authHandler.Logout)

	usersGroup := e.Group("/api/v1/users")
	usersGroup.Use(authMW)
	usersGroup.GET("/:id", userHandler.GetProfile)
	usersGroup.PUT("/:id", userHandler.ReplaceProfile)
	usersGroup.PATCH("/:id", userHandler.PatchProfile)
	usersGroup.DELETE("/:id", userHandler.DeleteProfile)
}

func runMigrations(dsn string) error {
	conn, err := sql.Open("pgx", dsn)
	if err != nil {
		return fmt.Errorf("open db connection: %w", err)
	}
	defer conn.Close()

	goose.SetBaseFS(migrations.Migrations)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("set goose dialect: %w", err)
	}
	if err := goose.Up(conn, "."); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	return nil
}
