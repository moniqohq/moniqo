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

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
	"github.com/pressly/goose/v3"
	"go.uber.org/zap"

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
	defer log.Sync() //nolint:errcheck

	if cfg.DatabaseURL == "" {
		log.Error("DATABASE_URL is required")
		os.Exit(1)
	}

	if cfg.JWTSecret == "" {
		log.Error("JWT_SECRET is required")
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

	// Email subsystem
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

	workerCtx, workerCancel := context.WithCancel(context.Background())
	defer workerCancel()
	go emailWorker.Run(workerCtx)

	// User registration
	userRepo := user.NewUserRepo(pool, log)
	userSvc := user.NewUserSvc(userRepo, emailSvc, cfg.BcryptCost, cfg.AppBaseURL, []byte(cfg.JWTSecret), log)
	userHandler := user.NewHandler(userSvc, log)

	reg := e.Group("/api/v1")
	reg.Use(appmw.RegisterRateLimiter())
	reg.POST("/users", userHandler.Register)

	// Auth: login (rate-limited, public) and logout (JWT-protected)
	jwtSecret := []byte(cfg.JWTSecret)
	authRepo := auth.NewAuthRepo(pool, log)
	authSvc := auth.NewAuthSvc(authRepo, jwtSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL, cfg.RefreshTokenMaxAge, log)
	authHandler := auth.NewHandler(authSvc, log)
	authMW := auth.Middleware(authRepo, jwtSecret, log)

	loginGroup := e.Group("/api/v1/auth")
	loginGroup.Use(appmw.LoginRateLimiter())
	loginGroup.POST("/login", authHandler.Login)
	loginGroup.POST("/refresh", authHandler.Refresh)

	logoutGroup := e.Group("/api/v1/auth")
	logoutGroup.Use(authMW)
	logoutGroup.POST("/logout", authHandler.Logout)

	usersGroup := e.Group("/api/v1/users")
	usersGroup.Use(authMW)
	usersGroup.GET("/:id", userHandler.GetProfile)
	usersGroup.PUT("/:id", userHandler.ReplaceProfile)
	usersGroup.PATCH("/:id", userHandler.PatchProfile)
	usersGroup.DELETE("/:id", userHandler.DeleteProfile)

	// Graceful shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Info("starting server", zap.String("addr", addr))

	go func() {
		<-quit
		log.Info("shutting down server")
		workerCancel()
		emailWorker.Wait() // drain the in-flight tick before closing the pool
		if err := e.Shutdown(context.Background()); err != nil {
			log.Error("server shutdown error", zap.Error(err))
		}
	}()

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
