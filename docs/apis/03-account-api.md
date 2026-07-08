# Account API

## Overview

The Account API manages financial ledger accounts within a budget.

In Moniqo:

- A **Budget** is the ownership boundary.
- An **Account** represents a financial ledger (e.g., Checking, Savings, Credit Card, Cash).
- All Accounts belong to a Budget.
- Accounts contain Transactions.
- Authorization is enforced per user within the budget.

This API supports:

- Creating financial accounts
- Retrieving accounts within a budget
- Updating account metadata
- Soft deleting accounts
- Managing reconciliation settings

All endpoints require authentication and budget membership validation.

**Base URL:** `/api/v1/budgets/{budget_id}/accounts`

---

## Domain Model — Account

Represents a financial ledger within a budget.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial numeric ID |
| `name` | String | Yes | Account display name |
| `type` | Enum | Yes | Account classification |
| `budget_id` | Integer | Yes | Foreign key referencing Budget |
| `balance` | Decimal | Yes | Computed current account balance (all transactions) |
| `cleared_balance` | Decimal | Yes | Computed balance from cleared + reconciled transactions only |
| `requires_recon` | Boolean | Yes | Indicates if reconciliation workflow is enabled |
| `last_reconciled_at` | String (ISO 8601) or null | Yes | Timestamp of the most recent reconciliation, null if never reconciled |
| `is_immutable` | Boolean | Yes | System-managed accounts that cannot be edited or deleted by users |
| `is_archived` | Boolean | Yes | Whether the account is archived (read-only, hidden from active selection) |
| `archived_at` | String (ISO 8601) or null | Yes | Timestamp the account was archived, null if active |
| `notes` | String | No | Optional descriptive notes |
| `account_number` | String or null | No | Optional account/card number, nullable |

### AccountType Enum

Allowed values: `CHECKING`, `SAVINGS`, `CREDIT_CARD`, `CASH`, `LOAN`

---

## Business Rules

### Global Rules

- All endpoints require authentication.
- User must be a member of the specified budget.
- Authorization evaluated per `(user_id, budget_id, role)`.
- All queries must include `WHERE budget_id = ?`.
- Soft delete must be used.
- Standardized API response format must be used.

### Account-Specific Rules

- `name` must be unique within a budget.
- `balance` and `cleared_balance` are system-calculated from transactions.
- `balance` and `cleared_balance` cannot be directly modified via update endpoints.
- `cleared_balance` sums only transactions with status `cleared` or `reconciled`; `balance` sums all active transactions regardless of status.
- `last_reconciled_at` is only updated via the reconcile endpoint.
- `is_on_budget` determines whether account affects budget allocations.
- Credit card accounts may require special allocation logic.
- Deleting an account performs cascade delete and soft deletes the associated transactions.
- Archiving is distinct from deletion: an archived account keeps its full transaction history, is frozen (read-only), and is hidden from active selection, but remains visible in reports.
- An account's `balance` must be exactly zero before it can be archived.
- Archived accounts cannot receive new or updated transactions; attempting to do so is rejected.
- Only `OWNER` or `ADMIN` may archive or unarchive an account.
- Archiving and unarchiving are idempotent.

---

## Endpoints

### Create Account

**`POST /api/v1/budgets/{budget_id}/accounts`**
**Authentication:** Required

**Request Payload**

```json
{
  "name": "HDFC Checking",
  "type": "checking",
  "requires_recon": true,
  "notes": "primary salary account",
  "account_number": "1234567890",
  "initial_balance": 10000.00
}
```

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "HDFC Checking",
    "type": "checking",
    "budget_id": 1,
    "balance": 10000.00,
    "requires_recon": true,
    "notes": "Primary salary account",
    "account_number": "1234567890"
  },
  "msg": "account created successfully"
}
```

> Empty list returns 200 with `data: []` — no error.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 401 | `UNAUTHORIZED` | User not authenticated |
| 403 | `FORBIDDEN` | Unauthorized access |
| 500 | `INTERNAL_ERROR` | Internal server error |

---

### Get All Accounts

**`GET /api/v1/budgets/{budget_id}/accounts`**
**Authentication:** Required

**Query Parameters**

| Param | Values | Default | Description |
|---|---|---|---|
| `status` | `active`, `archived`, `all` | `active` | Filters accounts by archived state |

**Business Rules**

- Only accounts belonging to the budget are returned.
- Soft-deleted accounts excluded.
- Defaults to active (non-archived) accounts only, preserving prior behavior; pass `?status=archived` or `?status=all` to include archived accounts.

---

### Get Single Account

**`GET /api/v1/budgets/{budget_id}/accounts/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "HDFC Checking",
    "type": "CHECKING",
    "budget_id": 1,
    "balance": 12500.00,
    "requires_recon": true,
    "notes": ""
  },
  "msg": "account fetched successfully"
}
```

**Business Rules**

- Account must belong to the specified budget.

**Error Scenarios**

| HTTP | Code |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |

---

### Replace Account (Full Update)

Idempotent operation.

**`PUT /api/v1/budgets/{budget_id}/accounts/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "name": "Primary Checking",
  "type": "checking",
  "requires_recon": false,
  "notes": "updated notes"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "Primary Checking",
    "type": "checking",
    "budget_id": 1,
    "balance": 12500.00,
    "requires_recon": false,
    "notes": "updated notes"
  },
  "msg": "account updated successfully"
}
```

**Business Rules**

- Name uniqueness enforced.
- Balance modification always creates a transaction (e.g., if user manually adjusts balance, a `manual_adjustment` transaction is created).
- Balance cannot be less than 0.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Account not found |
| 409 | `CONFLICT` | Duplicate name |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Partial Update Account

**`PATCH /api/v1/budgets/{budget_id}/accounts/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "notes": "updated only notes"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "Primary Checking",
    "type": "checking",
    "budget_id": 1,
    "balance": 12500.00,
    "requires_recon": false,
    "notes": "updated only notes"
  },
  "msg": "account updated successfully"
}
```

**Business Rules**

- Must not allow empty PATCH body.
- `balance` cannot be updated.
- Only mutable fields allowed: `name`, `type`, `is_on_budget`, `requires_recon`, `notes`, `account_number`, `archived`.
- Setting `archived: true`/`false` is equivalent to calling the dedicated archive/unarchive endpoints below (same OWNER/ADMIN gate and zero-balance rule apply).

**Validation Rules**

- All required fields must be present.
- Must not allow empty PATCH body.
- Enum validation required.
- Name uniqueness must be validated.
- Balance cannot be less than 0.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Account not found |
| 409 | `CONFLICT` | Duplicate name |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Delete Account (Soft Delete)

Idempotent operation.

**`DELETE /api/v1/budgets/{budget_id}/accounts/{id}`**
**Authentication:** Required. Role must be `OWNER` or `ADMIN`.

**Response — 200 OK**

```json
{
  "success": true,
  "msg": "account deleted successfully"
}
```

**Business Rules**

- Must be soft delete.
- Repeated deletes must not cause failure.
- Accounts with transactions remain preserved.

**Side Effects**

- Mark account inactive.
- Exclude from standard queries.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid ID |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Account not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Reconcile Account

Marks all `cleared` transactions on the account as `reconciled` and stamps `last_reconciled_at` with the current time.

**`POST /api/v1/budgets/{budget_id}/accounts/{id}/reconcile`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "HDFC Checking",
    "type": "checking",
    "budget_id": 1,
    "balance": 10000.00,
    "cleared_balance": 10000.00,
    "requires_recon": true,
    "last_reconciled_at": "2026-07-07T10:15:00Z",
    "notes": "Primary salary account"
  },
  "msg": "account reconciled successfully"
}
```

**Business Rules**

- Transactions with status `cleared` transition to `reconciled`; `uncleared` transactions are untouched.
- `cleared_balance` is unchanged by reconciling (reconciled transactions still count toward it).
- Idempotent: reconciling with no cleared transactions still updates `last_reconciled_at`.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid ID |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Account not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Archive Account

Marks the account as archived: read-only, hidden from active selection, but preserved in reports and history. Idempotent — archiving an already-archived account returns it unchanged.

**`POST /api/v1/budgets/{budget_id}/accounts/{id}/archive`**
**Authentication:** Required. Role must be `OWNER` or `ADMIN`.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "HDFC Checking",
    "type": "checking",
    "budget_id": 1,
    "balance": 0,
    "cleared_balance": 0,
    "requires_recon": true,
    "is_archived": true,
    "archived_at": "2026-07-07T10:15:00Z",
    "notes": "Primary salary account"
  },
  "msg": "account archived successfully"
}
```

**Business Rules**

- Account balance must be exactly zero.
- Idempotent: re-archiving an already-archived account succeeds without change.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid ID, or balance is not zero |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Caller is not `OWNER` or `ADMIN` |
| 404 | `NOT_FOUND` | Account not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Unarchive Account

Restores an archived account to active use. Idempotent — unarchiving an already-active account returns it unchanged.

**`POST /api/v1/budgets/{budget_id}/accounts/{id}/unarchive`**
**Authentication:** Required. Role must be `OWNER` or `ADMIN`.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "name": "HDFC Checking",
    "type": "checking",
    "budget_id": 1,
    "balance": 0,
    "cleared_balance": 0,
    "requires_recon": true,
    "is_archived": false,
    "archived_at": null,
    "notes": "Primary salary account"
  },
  "msg": "account unarchived successfully"
}
```

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid ID |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Caller is not `OWNER` or `ADMIN` |
| 404 | `NOT_FOUND` | Account not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

## Deletion Scenarios

### Case 1 — Account Has No Transactions

Safe case.

- ✔ Hard delete account
- ✔ No side effects
- ✔ No balance impact

### Case 2 — Account Has Transactions (Most Common)

You cannot delete an account with history. You must close it, zero the balance, and archive it.

| Item | Effect |
|---|---|
| Transactions | Remain intact |
| Balance | Frozen |
| New Transactions | Not allowed |
| UI | Hidden from active selection |
| Reports | Still included |

**Before archiving:**

- Ensure reconciliation is complete.
- Ensure balance is correct.
- If balance ≠ 0: force user to transfer remaining balance to another account, or record a closing adjustment transaction.

---

## Architectural Rules

- **Transactions are immutable.**
- **Accounts are containers.** Containers can be archived.
- **Ledger entries cannot be destroyed.**
