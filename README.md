[![CI](https://github.com/moniqohq/moniqo/actions/workflows/ci.yml/badge.svg)](https://github.com/moniqohq/moniqo/actions/workflows/ci.yml)

# Moniqo

**Website:** [https://moniqo.in](https://moniqo.in) · **App:** [https://app.moniqo.in](https://app.moniqo.in)


An open-source, self-hostable budgeting app built around cash-based, zero-based envelope budgeting.

Most budgeting tools either lock your financial data behind a subscription and a closed-source server, or hand you a spreadsheet and no automation. Moniqo is a self-hosted alternative: every dollar gets assigned to an envelope, allocation is always backed by real cash on hand, and the entire stack — backend, database, and web app — runs on infrastructure you control.

## Why Moniqo?

- **You own the data.** Postgres is your database, running wherever you choose. No third party has your transaction history.
- **Envelope budgeting done correctly.** Money moves from "To Be Budgeted" into envelopes before it can be spent — allocation and spending are modeled as distinct, cash-backed operations, not just labels on a transaction.
- **Multi-user by design.** Budgets are architected around per-budget membership with roles (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`) rather than per-account sharing — useful for households or shared finances. This is a planned capability; see [Features](#features).
- **Open source, GPLv3.** Inspect it, self-host it, modify it.

Moniqo is an early-stage project. It does not yet match the polish or reporting depth of established tools — the comparison below is about approach and control, not feature-for-feature completeness.

|  | Moniqo | YNAB | Actual Budget | Money Manager | Spreadsheet |
|---|---|---|---|---|---|
| Open source | Yes (GPLv3) | No | Yes | No | N/A |
| Self-hosted | Yes | No | Yes | No | N/A (local file) |
| Hosted option | Yes ([app.moniqo.in](https://app.moniqo.in)) | Yes | No | Yes (mobile app + cloud sync) | N/A |
| Budgeting approach | Zero-based envelope | Zero-based envelope | Zero-based envelope | Manual expense tracking | Manual |
| Multi-user / roles | Planned (per-budget roles) | Limited sharing | Limited sharing | Limited sharing | No |
| Setup | Docker Compose + SaaS | None (SaaS) | Docker / desktop app | None (mobile app) | None |
| Maturity | Early / MVP | Mature | Mature | Mature | N/A |

## Who is Moniqo for?

- People who want zero-based, envelope-style budgeting and are comfortable self-hosting, or would rather use the hosted SaaS at [app.moniqo.in](https://app.moniqo.in).
- Developers or technically inclined users who want an open-source budgeting backend they can run, inspect, and extend.
- People who'd rather keep their financial data on their own infrastructure than in a third-party SaaS.

Moniqo is **not yet** a good fit if you need import integrations, mobile or desktop apps, or a mature reporting suite — none of that exists yet (see [Roadmap](#roadmap)). Bank sync is not planned; Moniqo is manual-entry by design.

## Features

**Available now**

- Email/password authentication with JWT access + refresh tokens, plus Google OIDC login/linking
- Password reset and email-change flows, backed by a real email worker (SMTP, Mailpit locally)
- Accounts, including archive/unarchive and reconciliation
- Envelopes with allocation, reallocation, and cash-backed allocation guards
- Transactions (create/list/edit/delete) scoped to a budget, with a dashboard and budget summary
- Cross-entity search within a budget
- Guided onboarding flow (income sources, step-based setup)
- Web app (Next.js) covering the above: dashboard, budgets, accounts, transactions, envelopes, reports, and settings

**Not yet implemented / mocked in the UI**

- Goals: the web UI exists but is not yet backed by a real API — no `goal` domain exists in the backend
- Transaction import
- Desktop and mobile apps: `apps/desktop` and `apps/mobile` are empty placeholders in this repo today, not working applications
- Per-user roles (`OWNER`/`ADMIN`/`EDITOR`/`VIEWER`) and ownership transfer for budgets: budgets are single-user today; there is no UI to invite or manage members on a budget yet

**Planned** (see [ROADMAP.md](ROADMAP.md))

- Shared budgets with per-user roles and ownership transfer
- Recurring transactions, forecasting, spending trends
- Real-time sync and conflict resolution for shared budgets
- Import/export tools and a public API
- Desktop and mobile clients

## Quick Start

Requires Docker (or Podman) and Docker Compose.

```bash
git clone https://github.com/moniqohq/moniqo.git
cd moniqo
printf 'POSTGRES_PASSWORD=change-me\nJWT_SECRET=%s\n' "$(openssl rand -base64 32)" > .env
docker compose up -d
```

This starts PostgreSQL and Mailpit (for local email testing). Database migrations run automatically when the backend starts.

To also build and run the backend and web app in containers (built locally from `apps/backend/Dockerfile` and `apps/web/Dockerfile`), use the `app` profile:

```bash
docker compose --profile app up -d
```

- Web app: `http://localhost:3000`
- Backend API: `http://localhost:8080/api/v1`
- Mailpit UI (catches outgoing emails locally): `http://localhost:8025`

`POSTGRES_PASSWORD` and `JWT_SECRET` are required by `docker-compose.yml`; everything else (Google OIDC, avatar storage, ports) is optional and defaults sensibly — see the environment variables used in [docker-compose.yml](docker-compose.yml).

## Development

Prerequisites: Go 1.22+, Node.js 20 LTS, pnpm 9, Docker.

```bash
pnpm install
make docker-compose-up   # Postgres + Mailpit
make dev-backend         # run the Go backend
make dev-web             # run the Next.js web app
```

Other useful targets (all defined in the `Makefile`, delegating to Mage):

- `make test` — run all tests
- `make lint` / `make fmt` — lint / format
- `make generate` — regenerate sqlc code after editing `apps/backend/db/queries/*.sql`
- `make migrate-up` / `make migrate-down` — apply / roll back database migrations
- `make help` — list all targets

See [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming, commit conventions, and the PR process.

## Architecture

Moniqo is a single Go backend (Echo + PostgreSQL via sqlc/pgx) serving a Next.js web frontend over a REST API (`/api/v1`). The backend is organized as one package per domain (`auth`, `user`, `budget`, `account`, `envelope`, `transaction`, `search`, `onboarding`, `email`, …) under `apps/backend/internal/`, each following the same handler/service/repo slice pattern. Every financial entity is scoped to a `budget_id`; users access budgets only through membership records, never directly.

Details: [docs/moniqo_architecture.md](docs/moniqo_architecture.md) and [docs/moniqo_domain_doctrine.md](docs/moniqo_domain_doctrine.md).

## Authentication

- Email + password, with bcrypt-hashed passwords and JWT access/refresh tokens
- Google OIDC (login and account linking)
- Password reset and email-change flows via a signed-token email loop

## Deployment

The primary supported path today is Docker Compose (see Quick Start), which runs Postgres, Mailpit, and — with the `app` profile — the backend and web app built locally.

Tagged releases also publish prebuilt images (`moniqohq/moniqo-backend`, `moniqohq/moniqo-web`) — see `release/docker-compose.yml` and `release/config/.env.example`. For a production-style reference deployment (Caddy as reverse proxy, Cloudflare Tunnel for public access), see `deployment/docker-compose.yml` and `deployment/.env.example`.

## Roadmap

See [ROADMAP.md](ROADMAP.md) or the [public roadmap](https://moniqo.in/roadmap/) for the full, longer-term plan. In short: the current focus is finishing core budgeting workflows (allocation, reconciliation, transfers); planning/insights features, collaborative sync, and desktop/mobile clients are later phases and not yet started.

## Contributing

Contributions require agreeing to the CLA ([individual](agreements/individual_contributor.md) or [corporate](agreements/corporate_contributor.md)). See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, branch naming, commit conventions, and the PR process. Report security issues privately to `support@moniqo.in` — do not open public issues for security bugs.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
