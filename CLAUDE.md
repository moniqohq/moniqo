# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository State

Implementation is **underway**. The monorepo is scaffolded and the backend has a working vertical slice. **M1 (User / Auth / Email) is built**: registration, login, JWT auth + middleware, password reset, and an email worker, with sqlc-generated DB code, goose migrations, and substantial test coverage under `apps/backend/`. **M2 (Budget Core) is the milestone in progress.**

The source of truth for *what* to build lives in:

- `docs/moniqo_domain_doctrine.md` — non-negotiable domain invariants (read first)
- `docs/moniqo_architecture.md` — tenant model, RBAC, tech stack, monorepo layout
- `docs/apis/0[1-5]-*.md` — REST API specs for User, Budget, Account, BudgetEnvelope, Transaction

Treat the API spec docs as authoritative request/response contracts; do not redesign endpoints without explicit user confirmation. When building a new domain, **mirror the existing user/auth slice** rather than inventing structure.

## Commands

All developer tasks go through the `Makefile`, which delegates to Mage (`magefiles/`); Mage is auto-installed via `go install` on first use. Run from the repo root:

- `make build` / `make build-backend` — build all apps / just the Go backend
- `make test` — run all tests
- `make lint` / `make fmt` — run linters / auto-format
- `make generate` — run code generators (sqlc, etc.) — **re-run after editing `db/queries/*.sql`**
- `make migrate-up` / `make migrate-down` — apply / roll back DB migrations (goose)
- `make docker-compose-up` / `make docker-compose-down` — Postgres + Mailpit stack
- `make mailpit-up` — Mailpit only (local email testing)
- `make dev-backend` / `make dev-web` — run an app in dev mode
- `make help` — list all targets

For backend-only Go work you can also use `go test ./...` etc. directly inside `apps/backend/`.

## Core Domain Invariants (Non-Negotiable)

These come from the domain doctrine and must hold at the data-model level — not just enforced in application code. Violating any of them is a design bug, not an implementation detail.

1. **Budget is the tenant boundary.** Every financial entity (`Account`, `Transaction`, `BudgetEnvelope`, etc.) references `budget_id`. **No financial entity references `user_id` directly.** Users access financial data only through `BudgetUser` membership.
2. **Budgets are strictly isolated.** No shared accounts across budgets, no cross-budget transfers, no shared cash pools. Each budget is an independent aggregate ("one budget = one financial universe"). If the same real-world bank account appears in two budgets, treat them as two independent representations — do not attempt global reconciliation.
3. **Authorization is evaluated per `(user_id, budget_id)` pair**, not per user. The same user may be `OWNER` in one budget and `VIEWER` in another. Roles live in `budget_users.role` (`OWNER` | `ADMIN` | `EDITOR` | `VIEWER`).
4. **All queries on financial entities must filter by `budget_id`** (the API specs say `WHERE budget_id = ?` is mandatory). Missing the budget scope is a security bug, not a correctness bug.
5. **Allocation must always be cash-backed.** Moniqo is zero-based + cash-based + envelope-method. Allocation (moving money from "To Be Budgeted" → envelopes) is conceptually distinct from spending (reducing envelope balances). Do not collapse these.
6. **Soft delete only.** Both users and budgets soft-delete; cascades are logical, not physical. Historical transactions are preserved for audit even when their containing budget is deleted.
7. **Credit card liabilities must auto-reconcile to payment categories** (per doctrine item 6 — keep this in mind when modeling card accounts and envelopes).

## Tech Stack and Layout

The stack (per `docs/moniqo_architecture.md`) is:

- **Backend:** Go + Echo + PostgreSQL + sqlc, JWT auth (pgx driver, goose migrations)
- **Web:** Next.js
- **Desktop:** Tauri (Tauri → Go through explicit wrapper handlers — UI never touches DB or filesystem directly)
- **Mobile:** React Native + Expo
- **Shared:** Tailwind + shadcn/ui, Zustand, React Hook Form, Zod, Recharts
- **Monorepo:** native pnpm workspaces + Mage (no Turborepo/Nx)

The monorepo is rooted at `moniqo/` with `apps/{backend,web,desktop,mobile,landing}` and `packages/{ui,types,sdk,validation,config,design-system}`.

**Canonical DB is PostgreSQL** — sqlc is configured with the `postgresql` engine, the backend uses pgx, and `docker-compose.yml` runs `postgres:17`. The "SQLite" line under README "Core Stack" is stale documentation, not an open decision — do not treat it as a question to resolve.

### Backend layout and slice pattern

Backend code lives under `apps/backend/`:

- `cmd/server/main.go` — entrypoint and wiring
- `internal/<domain>/` — one package per domain (`auth`, `user`, `email`, …), each holding `*_handler.go`, `*_service.go`, `*_repo.go`, `*_types.go` plus `*_test.go`
- `internal/validator/` — request validation (e.g. username/password rules)
- `internal/httpx/` — shared response envelope + error helpers
- `internal/middleware/` — logging, rate limiting, recover; `internal/auth/middleware.go` is the JWT guard
- `internal/mock/` — hand-written mocks for service/repo interfaces used in tests
- `db/migrations/*.sql` — goose migrations (numbered, e.g. `00004_password_reset.sql`)
- `db/queries/*.sql` — sqlc query source; **edit these, then `make generate`**
- `db/generated/` — sqlc output; **never edit by hand**

**To add a new domain, mirror this slice:** migration → `db/queries/<domain>.sql` → `make generate` → domain types → repo → service → handler → route wiring in `main.go`, with `_test.go` alongside each layer and mocks in `internal/mock/`.

## API Conventions

All endpoint specs in `docs/apis/` follow the same conventions — preserve them when implementing handlers:

- **Base path:** `/api/v1/<resource>` (e.g., `/api/v1/budgets`, `/api/v1/users`)
- **Response envelope:** every response wraps in `{ "success": bool, "data": <payload>, "msg": "<lowercase sentence>" }`. Errors also use this envelope.
- **Auth:** JWT, required on all endpoints *except* registration, login, and password reset.
- **Empty collections:** return `200` with `data: []`, **never** `404`.
- **Passwords:** bcrypt-hashed. The `hash` field must **never** appear in any API response — not even null. Strip it at the serialization boundary, not the handler.
- **Username constraints:** alphanumeric + `_`, `-`, `^`; cannot start with a number; max length 12.
- **Idempotency:** `PUT` and `DELETE` operations must be idempotent (re-deleting a deleted user is a success, not an error).
- **Authorization checks** for user modifications: only the budget `OWNER` can modify or unlink other users from that budget.

## Working with Contributions

- The project requires a CLA: individual contributors agree to `agreements/individual_contributor.md`, corporate contributors to `agreements/corporate_contributor.md`. Mention this if a user asks about contributing or opening a PR.
- Security disclosures go to `support@moniqo.in` privately — never recommend filing public issues for security bugs.
- The project license is GPL v3 (see `LICENSE`). Be mindful when suggesting dependencies or copying code from incompatible sources.
