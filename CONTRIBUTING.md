# Contributing to Moniqo

Thank you for your interest in contributing to Moniqo. This guide covers everything you need to get started, from setting up your local environment to getting your pull request merged.

Please read this document in full before opening an issue or submitting a contribution.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Contributor License Agreement](#contributor-license-agreement)
- [Security Vulnerabilities](#security-vulnerabilities)
- [Local Development Setup](#local-development-setup)
- [Branch Naming](#branch-naming)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Closing Policy](#closing-policy)

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold these standards. Unacceptable behavior can be reported to [support@moniqo.in](mailto:support@moniqo.in).

---

## Contributor License Agreement

By submitting code as an individual you agree to the [Individual Contributor License Agreement](agreements/individual_contributor.md). By submitting code on behalf of a company or other legal entity you agree to the [Corporate Contributor License Agreement](agreements/corporate_contributor.md).

You must agree to a CLA before your contribution can be accepted. This applies to all code, documentation, and other content submitted to this repository.

---

## Security Vulnerabilities

Report suspected security vulnerabilities privately to [support@moniqo.in](mailto:support@moniqo.in). Do not open public issues for security bugs. You can expect an acknowledgement within two business days and a fix within one week of disclosure in most cases.

---

## Local Development Setup

### Prerequisites

| Tool | Minimum version |
|------|----------------|
| Go | 1.22 |
| Node.js | 20 LTS |
| pnpm | 9 |
| Docker + Docker Compose | latest stable |
| Rust + Cargo (Tauri) | 1.77 |

### 1. Clone the repository

```bash
git clone https://github.com/moniqohq/moniqo.git
cd moniqo
```

### 2. Install JavaScript dependencies

```bash
pnpm install
```

### 3. Start infrastructure services

A Docker Compose file provides PostgreSQL and Redis for local development.

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port `5432`
- Redis on port `6379`

### 4. Configure environment variables

Copy the example env file for the backend and fill in the values:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `PORT` | Port the API server listens on (default `8080`) |

### 5. Run the backend

```bash
cd apps/backend
go run ./cmd/server
```

### 6. Run the web app

```bash
pnpm --filter web dev
```

### 7. Run the desktop app (Tauri)

```bash
pnpm --filter desktop tauri dev
```

> The desktop app communicates with the Go backend through Tauri command wrappers. The UI layer must never access the database or filesystem directly.

---

## Branch Naming

Branches must follow this pattern:

```
<type>/<issue-number>-<short-description>
```

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `chore` | Tooling, dependencies, config, CI |
| `docs` | Documentation only |
| `refactor` | Code restructuring with no behavior change |
| `test` | Adding or improving tests |

Examples:

```
feat/42-envelope-allocation-api
fix/17-budget-scope-missing-on-query
docs/11-contributor-guide
chore/5-add-makefile
```

Always branch from `main` unless a maintainer directs otherwise.

---

## Commit Messages

Moniqo uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

### Types

| Type | Purpose |
|------|---------|
| `feat` | Introduces a new feature |
| `fix` | Patches a bug |
| `docs` | Documentation changes only |
| `chore` | Maintenance, tooling, or dependency updates |
| `refactor` | Refactoring with no functional change |
| `test` | Adding or updating tests |
| `ci` | Changes to CI/CD configuration |
| `perf` | Performance improvements |

### Scope

The scope is optional but encouraged. Use the name of the affected package or domain area, for example: `backend`, `web`, `desktop`, `envelope`, `transaction`, `auth`.

### Examples

```
feat(backend): add envelope allocation endpoint
fix(web): correct budget_id scoping on transaction list query
docs: expand contributing guide with dev setup instructions
chore(deps): bump Echo to v4.12.0
```

### Rules

- Use the imperative mood in the summary line ("add", not "added" or "adds").
- Keep the summary line under 72 characters.
- Reference the related issue in the footer: `Closes #42`.
- Breaking changes must include a `BREAKING CHANGE:` footer.

---

## Pull Request Process

### Before you open a PR

1. Make sure your branch is up to date with `main`.
2. Ensure all tests pass locally.
3. Confirm your changes satisfy the acceptance criteria on the linked issue.

### Fork and branch workflow

1. Fork the repository to your own GitHub account.
2. Create a branch following the [naming convention](#branch-naming) above.
3. Make your changes in focused, atomic commits.
4. Push your branch and open a pull request against `moniqohq/moniqo:main`.

### PR description

Your pull request description should include:

- A summary of what changed and why.
- The issue it resolves, using `Closes #<number>` so GitHub links and auto-closes it.
- Any notable decisions or trade-offs worth calling out in review.

### Review

- A maintainer will review your PR, typically within a few business days.
- Address feedback by pushing additional commits, not force-pushing, unless explicitly asked.
- Once approved, a maintainer will merge it using squash merge to keep the history clean.

### After merge

Delete your feature branch after merge. The issue will close automatically if you used `Closes #<number>` in your PR description.

---

## Closing Policy

Issues and pull requests that do not follow this guide may be closed without notice. We will do our best to explain the reason. Please treat contributors and maintainers with courtesy.

All communication must be in English and appropriate for a professional audience of all ages.

If you have questions, reach out at [support@moniqo.in](mailto:support@moniqo.in).
