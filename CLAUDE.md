# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository State

This repository is **pre-implementation**. There is no source code, build system, or test suite yet — only design documentation under `docs/` and project governance files at the root. Do not invent build, lint, or test commands; if a user asks to run them, point out that the implementation has not started and clarify what they want scaffolded.

When implementation begins, the source of truth for *what* to build lives in:

- `docs/moniqo_domain_doctrine.md` — non-negotiable domain invariants (read first)
- `docs/moniqo_architecture.md` — tenant model, RBAC, planned tech stack, planned monorepo layout
- `docs/apis/0[1-6]-*.md` — REST API specs for User, Budget, Account, BudgetEnvelope, Transaction, EnvelopeTemplate

Treat the API spec docs as authoritative request/response contracts; do not redesign endpoints without explicit user confirmation.

## Core Domain Invariants (Non-Negotiable)

These come from the domain doctrine and must hold at the data-model level — not just enforced in application code. Violating any of them is a design bug, not an implementation detail.

1. **Budget is the tenant boundary.** Every financial entity (`Account`, `Transaction`, `BudgetEnvelope`, etc.) references `budget_id`. **No financial entity references `user_id` directly.** Users access financial data only through `BudgetUser` membership.
2. **Budgets are strictly isolated.** No shared accounts across budgets, no cross-budget transfers, no shared cash pools. Each budget is an independent aggregate ("one budget = one financial universe"). If the same real-world bank account appears in two budgets, treat them as two independent representations — do not attempt global reconciliation.
3. **Authorization is evaluated per `(user_id, budget_id)` pair**, not per user. The same user may be `OWNER` in one budget and `VIEWER` in another. Roles live in `budget_users.role` (`OWNER` | `ADMIN` | `EDITOR` | `VIEWER`).
4. **All queries on financial entities must filter by `budget_id`** (the API specs say `WHERE budget_id = ?` is mandatory). Missing the budget scope is a security bug, not a correctness bug.
5. **Allocation must always be cash-backed.** Moniqo is zero-based + cash-based + envelope-method. Allocation (moving money from "To Be Budgeted" → envelopes) is conceptually distinct from spending (reducing envelope balances). Do not collapse these.
6. **Soft delete only.** Both users and budgets soft-delete; cascades are logical, not physical. Historical transactions are preserved for audit even when their containing budget is deleted.
7. **Credit card liabilities must auto-reconcile to payment categories** (per doctrine item 6 — keep this in mind when modeling card accounts and envelopes).

## Planned Tech Stack and Layout

Per `docs/moniqo_architecture.md`, the intended stack is:

- **Backend:** Go + Echo + PostgreSQL + sqlc, JWT auth
- **Web:** Next.js
- **Desktop:** Tauri (the README emphasizes Tauri → Go through explicit wrapper handlers — UI never touches DB or filesystem directly)
- **Mobile:** React Native + Expo
- **Shared:** Tailwind + shadcn/ui, Zustand, React Hook Form, Zod, Recharts
- **Monorepo:** native (no Turborepo/Nx specified)

The doc sketches a monorepo rooted at `moniqo/` with `apps/{backend,web,desktop,mobile}` and `packages/{ui,types,sdk,validation,config,design-system}`. This is **planned**, not current — the working directory is `moniqo/` and contains only docs.

**Known inconsistency to flag with the user before scaffolding:** `README.md` lists SQLite under "Core Stack," while `docs/moniqo_architecture.md` lists PostgreSQL + sqlc. Ask which is canonical before generating schema or DB code.

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
