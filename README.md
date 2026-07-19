[![CI](https://github.com/moniqohq/moniqo/actions/workflows/ci.yml/badge.svg)](https://github.com/moniqohq/moniqo/actions/workflows/ci.yml)

**Website:** [https://moniqo.in](https://moniqo.in) · **App:** [https://app.moniqo.in](https://app.moniqo.in)

**Moniqo** is a modern financial software project focused on clarity, control, and long-term usability.

The goal is to build tools that help individuals understand, manage, and reason about their money without unnecessary complexity.

> Clarity is not a finishing step. It is the starting point.
---
## Vision

Most financial tools overwhelm users with features, dashboards, and abstractions that obscure what actually matters.

Moniqo is designed around a different principle:
- Clear mental models
- Predictable behavior
- Readable systems
- Long-term maintainability

Every decision in Moniqo prioritizes simplicity, correctness, and transparency.

---
## What Moniqo Is
  
Moniqo aims to become a **personal finance and money-management platform**, with a focus on:
- Budgeting and expense tracking
- Financial insights derived from clean data models
- Systems that are easy to reason about and extend
- A calm, minimal user experience
 
The project is intentionally opinionated and avoids feature bloat.

---
## What Moniqo Is Not

- A flashy finance app optimized for growth hacks
- A data-harvesting platform
- A cluttered dashboard with dozens of half-useful metrics

If a feature does not improve clarity, it does not belong here.

---
## Philosophy

Moniqo is built on a few non-negotiable principles:
- **Clarity over cleverness**
- **Readable codebases over dense abstractions**
- **Small, composable systems**
- **Deliberate decisions over rapid accumulation of features**

---
## Platform

Moniqo is a **multi-platform application** available on desktop, web, and mobile.
- Native desktop app (macOS, Windows, Linux)
- Web application with cloud sync
- Mobile app (iOS, Android)
- Multi-user collaboration with role-based access control
- Data is securely stored and accessible across devices

This approach prioritizes **privacy, performance, and long-term maintainability** while enabling collaboration and access from anywhere.

---
## Installation & Downloads (Desktop)

Prefer not to install anything? Just use the web app at
[https://app.moniqo.in](https://app.moniqo.in) — no download required.

Prebuilt binaries are provided for major desktop operating systems.
#### Supported Platforms
- **macOS** (Apple Silicon & Intel)
- **Windows** (x64)    
- **Linux** (x64)    
#### Download
1. Go to the **Releases** page of this repository    
2. Download the installer or archive for your operating system    
3. Install and launch the application like any native desktop app    

> No runtime dependencies are required. Everything is bundled with the app.

---
## Running the Server (Self-Hosted)

Don't want to self-host? Just use the hosted app at
[https://app.moniqo.in](https://app.moniqo.in).

Each release archive (`moniqo-<tag>-<os>-<arch>.tar.gz` / `.zip` on the
**Releases** page) bundles everything needed to run the backend and web app
yourself: `bin/` (backend binary), `web/` (Next.js standalone bundle),
`config/.env.example`, `scripts/` (`start.sh`, `stop.sh`), and
`docker-compose.yml`. Database migrations run automatically on backend
startup — no manual migration step is required.

Both options below start the same way — extract the archive and prepare your
environment file:

```sh
tar -xzf moniqo-<tag>-<os>-<arch>.tar.gz
cd moniqo-<tag>-<os>-<arch>
cp config/.env.example config/.env
# edit config/.env: set POSTGRES_PASSWORD, JWT_SECRET, EMAIL_SMTP_HOST, etc.
```

### Option A: Prebuilt Binaries

Runs the bundled `bin/moniqo` backend and `web/server.js` frontend directly
on the host. Requires Node.js (for the Next.js standalone server) and a
reachable PostgreSQL instance — neither is bundled with this option.

```sh
set -a; source config/.env; set +a
./scripts/start.sh   # starts backend + web, tracks PIDs in moniqo.pid
./scripts/stop.sh    # stops both
```

Once started, the web app listens on `http://localhost:3000` and the backend
API on `http://localhost:8080/api/v1` by default.

### Option B: Docker Compose

Runs Postgres plus the published `moniqohq/moniqo-backend` and
`moniqohq/moniqo-web` images — no local Go/Node toolchain or database setup
required.

```sh
docker compose --env-file config/.env -f docker-compose.yml up -d   # start
docker compose --env-file config/.env -f docker-compose.yml down    # stop
```

Once started, the web app listens on `http://localhost:3000` and the backend
API on `http://localhost:8080/api/v1` by default — override with `WEB_PORT`,
`BACKEND_PORT`, and `POSTGRES_PORT` in `config/.env`. Set `IMAGE_TAG` there
too to pin a specific release instead of floating on `latest` (e.g.
`IMAGE_TAG=<tag>`).

---
## Architecture Overview

The application follows a **shared-backend, multi-client architecture**:
#### Core Stack
- **Go + Echo** — Backend logic, data processing, and system-level operations, backed by PostgreSQL (via sqlc + pgx) and JWT auth
- **Tauri** — Desktop shell and secure system bridge
- **Next.js** — Web frontend
- **React Native + Expo** — Mobile frontend
- **PostgreSQL** — Database system
#### Inter-Layer Communication
- **Tauri communicates with Go through explicit wrapper handlers**
    - Tauri exposes a minimal set of commands        
    - Each command maps to a well-defined Go handler        
    - Handlers enforce validation, authorization, and error normalization        
- No direct database or filesystem access from the UI layer    
- All business logic and data access remain centralized in Go
    
This wrapper-based approach ensures:
- Clear API boundaries    
- Predictable data flow    
- Reduced coupling between UI and backend logic    
- Easier testing and future refactoring
#### Design Principles
- **Thin UI, strong backend**: Business logic lives in Go
- **Multi-user ready**: Role-based access control across all budgets
- **Cross-platform**: Desktop, web, and mobile clients share the same backend
- **Small binary size** compared to Electron-based apps

This architecture allows the application to feel **native, fast, and reliable** across platforms while keeping the codebase clean and understandable.
