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
	"strings"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/pressly/goose/v3"
	"go.uber.org/zap"

	_ "github.com/jackc/pgx/v5/stdlib"

	echomw "github.com/labstack/echo/v4/middleware"

	"github.com/moniqohq/moniqo/apps/backend/db/migrations"
	"github.com/moniqohq/moniqo/apps/backend/internal/account"
	"github.com/moniqohq/moniqo/apps/backend/internal/auth"
	"github.com/moniqohq/moniqo/apps/backend/internal/authz"
	"github.com/moniqohq/moniqo/apps/backend/internal/budget"
	"github.com/moniqohq/moniqo/apps/backend/internal/config"
	"github.com/moniqohq/moniqo/apps/backend/internal/email"
	"github.com/moniqohq/moniqo/apps/backend/internal/email/providers"
	"github.com/moniqohq/moniqo/apps/backend/internal/envelope"
	"github.com/moniqohq/moniqo/apps/backend/internal/logger"
	appmw "github.com/moniqohq/moniqo/apps/backend/internal/middleware"
	"github.com/moniqohq/moniqo/apps/backend/internal/transaction"
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
		_, _ = fmt.Fprintf(os.Stderr, "failed to initialize logger: %v\n", err)
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

const tokenCleanupInterval = time.Hour

func buildServer(cfg config.Config, pool *pgxpool.Pool, log *zap.Logger) *echo.Echo {
	e := echo.New()
	e.HideBanner = true
	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type", "X-Request-ID"},
		AllowCredentials: true,
	}))
	e.Use(echomw.RequestID())
	e.Use(appmw.Recover(log))
	e.Use(appmw.RequestLogger(log))

	emailSvc, emailWorker := buildEmailSubsystem(cfg, pool, log)
	workerCtx, workerCancel := context.WithCancel(context.Background())
	go emailWorker.Run(workerCtx)

	authRepo := auth.NewRepo(pool, log)
	go runTokenCleanup(workerCtx, authRepo, log)

	e.Server.RegisterOnShutdown(func() {
		workerCancel()
		emailWorker.Wait()
	})

	registerRoutes(e, cfg, pool, emailSvc, log)
	return e
}

// runTokenCleanup periodically removes expired rows from revoked_access_tokens
// and password_reset_tokens.
func runTokenCleanup(ctx context.Context, repo *auth.Repo, log *zap.Logger) {
	ticker := time.NewTicker(tokenCleanupInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			cleanExpiredTokens(ctx, repo, log)
		case <-ctx.Done():
			return
		}
	}
}

func cleanExpiredTokens(ctx context.Context, repo *auth.Repo, log *zap.Logger) {
	if err := repo.DeleteExpiredRevokedTokens(ctx); err != nil {
		log.Error("token cleanup: revoked access tokens failed", zap.Error(err))
	}
	if err := repo.DeleteExpiredPasswordResetTokens(ctx); err != nil {
		log.Error("token cleanup: password reset tokens failed", zap.Error(err))
	}
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

// publicRoute identifies a route that bypasses JWT authentication. A prefix
// route matches any path that begins with path (used for wildcard groups like
// the password-reset flow); otherwise path must match exactly.
type publicRoute struct {
	method string
	path   string
	prefix bool
}

// matches reports whether the route covers the given request method and path.
func (r publicRoute) matches(method, path string) bool {
	if r.method != method {
		return false
	}
	if r.prefix {
		return strings.HasPrefix(path, r.path)
	}
	return path == r.path
}

// newAuthSkipper builds the skipper consulted by the global auth middleware.
// The slice below is the single source of truth for routes excluded from
// authentication — keep all exclusions here, never scattered across registrations.
func newAuthSkipper() echomw.Skipper {
	routes := []publicRoute{
		{method: http.MethodPost, path: "/api/v1/users"},                              // registration
		{method: http.MethodPost, path: "/api/v1/auth/login"},                         // login
		{method: http.MethodPost, path: "/api/v1/auth/refresh"},                       // cookie-based refresh
		{method: http.MethodPost, path: "/api/v1/auth/password-reset"},                // request reset
		{method: http.MethodPost, path: "/api/v1/auth/password-reset/", prefix: true}, // confirm reset + subpaths
		{method: http.MethodGet, path: "/api/v1/users/verify"},                        // email verification
	}
	return func(c echo.Context) bool {
		req := c.Request()
		if req.Method == http.MethodOptions {
			return true
		}
		for _, r := range routes {
			if r.matches(req.Method, req.URL.Path) {
				return true
			}
		}
		return false
	}
}

func registerRoutes(e *echo.Echo, cfg config.Config, pool *pgxpool.Pool, emailSvc *email.Service, log *zap.Logger) {
	jwtSecret := []byte(cfg.JWTSecret)

	userRepo := user.NewRepo(pool, log)
	userSvc := user.NewSvc(userRepo, emailSvc, cfg.BcryptCost, cfg.APIBaseURL, jwtSecret, log)
	userHandler := user.NewHandler(userSvc, cfg.AppBaseURL, log)

	authRepo := auth.NewRepo(pool, log)
	authSvc := auth.NewSvc(authRepo, jwtSecret, cfg.AccessTokenTTL, cfg.RefreshTokenTTL, cfg.RefreshTokenMaxAge, log)
	authHandler := auth.NewHandler(authSvc, log, cfg.Env != "development")

	passwordResetSvc := auth.NewPasswordResetSvc(
		authRepo,
		emailSvc,
		cfg.BcryptCost,
		cfg.PasswordResetTokenTTL,
		cfg.AppBaseURL,
		log,
	)
	passwordResetHandler := auth.NewPasswordResetHandler(passwordResetSvc, log)

	// Auth middleware is applied globally; public routes are skipped via the skipper.
	e.Use(auth.Middleware(authRepo, jwtSecret, log, newAuthSkipper()))

	reg := e.Group("/api/v1")
	reg.Use(appmw.RegisterRateLimiter())
	reg.POST("/users", userHandler.Register)

	loginGroup := e.Group("/api/v1/auth")
	loginGroup.Use(appmw.LoginRateLimiter())
	loginGroup.POST("/login", authHandler.Login)
	loginGroup.POST("/refresh", authHandler.Refresh)

	authGroup := e.Group("/api/v1/auth")
	authGroup.POST("/logout", authHandler.Logout)

	passwordResetGroup := e.Group("/api/v1/auth/password-reset")
	passwordResetGroup.Use(appmw.PasswordResetRateLimiter())
	passwordResetGroup.POST("", passwordResetHandler.RequestReset)
	passwordResetGroup.POST("/confirm", passwordResetHandler.ConfirmReset)

	verifyGroup := e.Group("/api/v1/users")
	verifyGroup.GET("/verify", userHandler.VerifyEmail)

	usersGroup := e.Group("/api/v1/users")
	usersGroup.GET("/:id", userHandler.GetProfile)
	usersGroup.PUT("/:id", userHandler.ReplaceProfile)
	usersGroup.PATCH("/:id", userHandler.PatchProfile)
	usersGroup.DELETE("/:id", userHandler.DeleteProfile)

	registerBudgetRoutes(e, pool, log)
	registerAccountRoutes(e, pool, log)
	registerEnvelopeRoutes(e, pool, log)
	registerTransactionRoutes(e, pool, log)
}

func registerBudgetRoutes(e *echo.Echo, pool *pgxpool.Pool, log *zap.Logger) {
	budgetRepo := budget.NewRepo(pool, log)
	budgetSvc := budget.NewSvc(budgetRepo, log)
	budgetHandler := budget.NewHandler(budgetSvc, log)

	membershipRepo := budget.NewMembershipRepo(pool, log)
	membershipSvc := budget.NewMembershipSvc(membershipRepo, log)
	membershipHandler := budget.NewMembershipHandler(membershipSvc, log)

	// POST /api/v1/budgets — create; any authenticated user, no :id guard needed.
	budgetsCreate := e.Group("/api/v1/budgets")
	budgetsCreate.POST("", budgetHandler.Create)

	// Remaining budget routes require membership + minimum role via guard.
	budgetsGroup := e.Group("/api/v1/budgets")
	budgetsGroup.GET("", budgetHandler.List)
	budgetsGroup.GET("/:id", budgetHandler.Get,
		budget.RequireBudgetAccess(membershipRepo, authz.BudgetView, log))
	budgetsGroup.PUT("/:id", budgetHandler.Replace,
		budget.RequireBudgetAccess(membershipRepo, authz.BudgetEdit, log))
	budgetsGroup.PATCH("/:id", budgetHandler.Patch,
		budget.RequireBudgetAccess(membershipRepo, authz.BudgetEdit, log))
	budgetsGroup.DELETE("/:id", budgetHandler.Delete,
		budget.RequireBudgetAccess(membershipRepo, authz.BudgetDelete, log))

	// Membership routes — all require ManageMembers (OWNER only).
	membersGroup := e.Group("/api/v1/budgets")
	membersGroup.GET("/:id/members", membershipHandler.ListMembers,
		budget.RequireBudgetAccess(membershipRepo, authz.ManageMembers, log))
	membersGroup.POST("/:id/members", membershipHandler.AddMember,
		budget.RequireBudgetAccess(membershipRepo, authz.ManageMembers, log))
	membersGroup.PATCH("/:id/members/:userId", membershipHandler.UpdateMemberRole,
		budget.RequireBudgetAccess(membershipRepo, authz.ManageMembers, log))
	membersGroup.DELETE("/:id/members/:userId", membershipHandler.RemoveMember,
		budget.RequireBudgetAccess(membershipRepo, authz.ManageMembers, log))
	membersGroup.POST("/:id/transfer-ownership", membershipHandler.TransferOwnership,
		budget.RequireBudgetAccess(membershipRepo, authz.TransferOwnership, log))
}

func registerAccountRoutes(e *echo.Echo, pool *pgxpool.Pool, log *zap.Logger) {
	membershipRepo := budget.NewMembershipRepo(pool, log)

	accountRepo := account.NewRepo(pool, log)
	accountSvc := account.NewSvc(accountRepo, log)
	accountHandler := account.NewHandler(accountSvc, log)

	// Account routes are nested under a budget; budget_id is the membership scope.
	accountsGroup := e.Group("/api/v1/budgets/:budget_id/accounts")
	accountsGroup.GET("", accountHandler.ListAccounts,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.AccountView, log))
	accountsGroup.POST("", accountHandler.CreateAccount,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.AccountEdit, log))
	accountsGroup.GET("/:id", accountHandler.GetAccount,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.AccountView, log))
	accountsGroup.PUT("/:id", accountHandler.ReplaceAccount,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.AccountEdit, log))
	accountsGroup.PATCH("/:id", accountHandler.PatchAccount,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.AccountEdit, log))
	accountsGroup.DELETE("/:id", accountHandler.DeleteAccount,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.AccountView, log))
}

func registerEnvelopeRoutes(e *echo.Echo, pool *pgxpool.Pool, log *zap.Logger) {
	membershipRepo := budget.NewMembershipRepo(pool, log)

	envelopeRepo := envelope.NewRepo(pool, log)
	envelopeSvc := envelope.NewSvc(envelopeRepo, log)
	envelopeHandler := envelope.NewHandler(envelopeSvc, log)

	// Envelope routes are nested under a budget; budget_id is the membership scope.
	envelopesGroup := e.Group("/api/v1/budgets/:budget_id/envelopes")
	envelopesGroup.GET("", envelopeHandler.ListEnvelopes,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.EnvelopeView, log))
	envelopesGroup.POST("", envelopeHandler.CreateEnvelope,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.EnvelopeEdit, log))
	envelopesGroup.GET("/:id", envelopeHandler.GetEnvelope,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.EnvelopeView, log))
	envelopesGroup.PUT("/:id", envelopeHandler.ReplaceEnvelope,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.EnvelopeEdit, log))
	envelopesGroup.PATCH("/:id", envelopeHandler.PatchEnvelope,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.EnvelopeEdit, log))
	envelopesGroup.DELETE("/:id", envelopeHandler.DeleteEnvelope,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.EnvelopeView, log))

	// Budget summary endpoint.
	e.GET("/api/v1/budgets/:budget_id/summary", envelopeHandler.GetBudgetSummary,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.BudgetView, log))
}

func registerTransactionRoutes(e *echo.Echo, pool *pgxpool.Pool, log *zap.Logger) {
	membershipRepo := budget.NewMembershipRepo(pool, log)

	txnRepo := transaction.NewRepo(pool, log)
	txnSvc := transaction.NewSvc(txnRepo, log)
	txnHandler := transaction.NewHandler(txnSvc, log)

	txnGroup := e.Group("/api/v1/budgets/:budget_id/transactions")
	txnGroup.GET("", txnHandler.ListTransactions,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.TransactionView, log))
	txnGroup.POST("", txnHandler.CreateTransaction,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.TransactionEdit, log))
	txnGroup.GET("/:id", txnHandler.GetTransaction,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.TransactionView, log))
	txnGroup.PUT("/:id", txnHandler.ReplaceTransaction,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.TransactionEdit, log))
	txnGroup.PATCH("/:id", txnHandler.PatchTransaction,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.TransactionEdit, log))
	txnGroup.DELETE("/:id", txnHandler.DeleteTransaction,
		budget.RequireBudgetAccessParam(membershipRepo, "budget_id", authz.TransactionView, log))
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
