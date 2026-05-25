# Moniqo Architecture Overview

## Overview

Moniqo supports a **multi-user, multi-budget architecture** where:

- Multiple users can exist in the system.
- A user may belong to multiple budgets.
- A budget may contain multiple users.
- Authorization is scoped at the user level within a budget.
- Domain entities (accounts, envelopes, transactions, templates) belong to a **budget**, not directly to a user.

In this model:

- **Budget** is the tenant boundary.
- **Account** remains a financial ledger inside a budget.

This design supports:

- Personal budgeting (single user, single budget)
- Multiple personal budgets per user
- Household/shared budgets
- Team-based financial collaboration
- Web and desktop synchronization
- Role-based access control (RBAC)

> The **Budget** becomes the primary ownership boundary.

---

## Repository Structure

> This structure reflects the current state of the monorepo and will evolve as the project grows — new apps, packages, and tooling will be added over time.

```
moniqo/
├── apps/
│   ├── backend/        # Go + Echo API
│   ├── web/            # Next.js app
│   ├── desktop/        # Tauri desktop app
│   └── mobile/         # React Native + Expo
│
├── packages/
│   ├── ui/             # Shared UI components
│   ├── types/          # Shared TypeScript types
│   ├── sdk/            # API SDK/client
│   ├── validation/     # Shared Zod schemas
│   ├── config/         # Shared configs
│   └── design-system/  # Tokens, themes, typography
```

---

## Tech Stack

| Layer       | Tech                 |
| ----------- | -------------------- |
| Backend     | Go                   |
| Framework   | Echo                 |
| Router      | Echo Router          |
| Database    | PostgreSQL           |
| Query Layer | sqlc                 |
| Cache       | Redis (later)        |
| Auth        | JWT                  |
| Web         | Next.js              |
| Desktop     | Tauri                |
| Mobile      | React Native + Expo  |
| UI          | Tailwind + shadcn/ui |
| State       | Zustand              |
| Forms       | React Hook Form      |
| Validation  | Zod                  |
| Charts      | Recharts             |
| Monorepo    | Native Monorepo      |

---

## Core Architectural Principles

- Budget is the tenant boundary.
- Users do not own financial data directly.
- All financial data belongs to a budget.
- Users access data through budget membership.
- Authorization is evaluated per `(user, budget)`.
- Account continues to represent a financial ledger.

| Concept | Owner |
|---|---|
| Ownership | Budget |
| Authorization | User (within a budget) |

---

## Domain Model

### User

Represents an authenticated identity. A user may belong to multiple budgets.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial numeric ID |
| `name` | String | No | Real name of the user |
| `username` | String | Yes | Unique username |
| `hash` | String | Yes | bcrypt password hash (never exposed) |
| `email` | String | No | Unique email address |
| `picture` | String | No | Stored avatar reference (URL or server UUID) |
| `last_login` | Time | No | Timestamp of most recent successful authentication |
| `status` | Enum | Yes | User lifecycle state (`ACTIVE`, `SUSPENDED`, `DELETED`) |
| `created_at` | Time | Yes | Creation timestamp |
| `updated_at` | Time | Yes | Last updated timestamp |

---

### Budget

Represents the ownership container for financial data. A budget may contain multiple users.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial numeric ID |
| `name` | String | Yes | Budget display name (e.g., *Family Budget*) |
| `status` | Enum | Yes | Budget lifecycle state (`ACTIVE`, `SUSPENDED`, `DELETED`) |
| `created_at` | Time | Yes | Creation timestamp |
| `updated_at` | Time | Yes | Last updated timestamp |

---

### BudgetUser (Membership)

Defines user membership and role within a budget.

> **Unique constraint** must exist on: `(budget_id, user_id)`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial numeric ID |
| `budget_id` | Integer | Yes | Foreign key referencing `Budget` |
| `user_id` | Integer | Yes | Foreign key referencing `User` |
| `role` | Enum | Yes | `OWNER`, `ADMIN`, `EDITOR`, `VIEWER` |
| `joined_at` | Time | Yes | Timestamp of membership |

---

## Domain Entities

> All financial entities **must** reference `budget_id`.  
> No financial entity references `user_id`.

### Account (Financial Ledger)

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated ID |
| `budget_id` | Integer | Yes | Foreign key referencing `Budget` |
| `name` | String | Yes | Ledger account name |
| `type` | Enum | Yes | `CHECKING`, `SAVINGS`, `CREDIT_CARD` |

### Transaction

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated ID |
| `budget_id` | Integer | Yes | Foreign key referencing `Budget` |
| `account_id` | Integer | Yes | Foreign key referencing `Account` |
| `envelope_id` | Integer | Yes | Foreign key referencing `Envelope` |
| `amount` | Decimal | Yes | Monetary value |

All queries must include:

```sql
WHERE budget_id = ?
```

Authorization is determined using:

```
(user_id, role, budget_id)
```

---

## Role-Based Access Control (RBAC)

| Role | Permissions |
|---|---|
| `OWNER` | Full control, manage users |
| `ADMIN` | Manage financial data |
| `EDITOR` | Create/update transactions |
| `VIEWER` | Read-only access |

Roles are stored in `budget_users.role`.

This allows the same user to be:

- `OWNER` in one budget
- `EDITOR` in another
- `VIEWER` in another

---

## Lifecycle Behavior

### If a user is deleted:

- Remove user row or mark as deleted.
- Remove corresponding budget memberships.
- Budget and financial data **remain intact**.
- Other users continue operating normally.

### If a budget is deleted:

- Soft delete budget.
- Cascade logically to owned entities.
- Memberships become inactive.
- Financial data remains preserved if required for audit.

---

## Final Architectural Statement

In **Moniqo**:

- **Budget** owns financial data.
- **Account** represents financial ledger within a budget.
- **Users** belong to budgets through membership.
- Authorization is enforced per `(user, budget)`.
- All financial data is isolated by `budget_id`.
- Shared budgeting is enabled via multiple users per budget.
- Users may participate in multiple budgets with different roles.

This model is:

- ✅ Clean
- ✅ Secure
- ✅ Scalable
- ✅ YNAB-aligned
- ✅ Web-ready
- ✅ Collaboration-ready
- ✅ Architecturally future-proof
