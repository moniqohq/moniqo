# @moniqo/web

The Next.js web frontend for [Moniqo](../../README.md), a self-hosted budgeting app. It talks to the Go backend (`apps/backend`) over the `/api/v1` REST API.

## Development

Run from the repo root — this app is part of the pnpm workspace and expects the backend and Postgres to be running alongside it.

```bash
pnpm install
make docker-compose-up   # Postgres + Mailpit, from the repo root
make dev-backend         # Go backend, from the repo root
pnpm --filter web dev    # or: make dev-web
```

Open [http://localhost:3000](http://localhost:3000). The app proxies API calls to the backend at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`, see `.env.example`).

## Structure

Source lives under `src/`:

- `app/` — routes (App Router): dashboard, budgets, accounts, transactions, envelopes, reports, settings, onboarding, auth (login/signup/forgot-reset password/OAuth callback)
- `components/` — UI grouped by feature (`accounts`, `transactions`, `envelopes`, `budget`, `reports`, `goals`, `settings`, `onboarding`, `dashboard`, `search`, `shared`, `ui`)
- `services`, `lib/api` — backend API client
- `stores` — Zustand stores (e.g. auth)
- `hooks`, `providers`, `types`, `constants`

Note: the `goals` UI is not yet backed by a real API — there is no `goal` domain in the backend.

## Building

```bash
pnpm --filter web build
pnpm --filter web start
```

See the [root README](../../README.md) for the full stack, Docker Compose setup, and architecture overview.
