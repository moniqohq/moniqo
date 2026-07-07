# Transaction API

## Overview

The Transaction API manages ledger entries within a budget.

A **Transaction** represents:

- A financial movement within an Account
- Allocation impact on a BudgetEnvelope
- Optionally, a transfer between two Accounts
- A dated ledger event

Transactions:

- Always belong to a Budget
- Always belong to an Account
- May belong to a BudgetEnvelope
- May represent a transfer between accounts
- Directly affect Account balance
- Directly affect Envelope spent amount

This API supports full CRUD operations and maintains financial integrity rules.

**Base URL:** `/api/v1/budgets/{budget_id}/transactions`

**Authentication:** JWT authentication required. User must be a member of the budget. Authorization evaluated per `(user_id, budget_id)`.

---

## Domain Model — Transaction

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial identifier |
| `budget_id` | Integer | Yes | Foreign key referencing Budget |
| `account_id` | Integer | Yes | Primary ledger account |
| `transfer_account_id` | Integer | No | Target account for transfer transactions |
| `budget_envelope_id` | Integer | No | Associated envelope for budgeting impact |
| `amount` | Decimal | Yes | Monetary value (positive or negative based on type) |
| `date` | Time | Yes | Transaction date |
| `status` | Enum | Yes | Clearing state: `uncleared`, `cleared`, `reconciled` |

### TransactionStatus Enum

Allowed values: `uncleared`, `cleared`, `reconciled`

- `uncleared` — default status for newly created transactions.
- `cleared` — the transaction has been matched against a bank statement and counts toward the account's `cleared_balance`.
- `reconciled` — set automatically when the containing account is reconciled (see Account API); also counts toward `cleared_balance`.
- Transactions may be created or patched with an explicit `status`; omitting it defaults to `uncleared`.

---

## Business Rules

### Global Rules

- All endpoints require authentication.
- User must be a member of the budget.
- Authorization evaluated per `(user_id, budget_id)`.
- All queries must include `WHERE budget_id = ?`.
- Soft delete is recommended.
- Financial consistency must always be preserved.
- Balance and spent amounts must be recalculated atomically.

### Transaction-Specific Rules

- Transaction must belong to a valid budget.
- `account_id` must belong to the same budget.
- `transfer_account_id` (if provided) must belong to the same budget.
- `budget_envelope_id` (if provided) must belong to the same budget.
- Transfer transactions must:
  - Not have `budget_envelope_id`
  - Create a mirrored transaction internally (optional implementation detail)
- Amount cannot be zero.
- Date must be valid.
- Editing a transaction must recalculate:
  - Account balance
  - Envelope spent amount
- Deleting a transaction must reverse its financial impact.

---

## Endpoints

### Create Transaction

**`POST /api/v1/budgets/{budget_id}/transactions`**
**Authentication:** Required. Role must be `OWNER`, `ADMIN`, or `EDITOR`.

**Request Payload — Standard**

```json
{
  "account_id": 10,
  "budget_envelope_id": 5,
  "amount": -1500.00,
  "date": "2026-03-01T00:00:00Z"
}
```

**Request Payload — Transfer**

```json
{
  "account_id": 10,
  "transfer_account_id": 12,
  "amount": -5000.00,
  "date": "2026-03-01T00:00:00Z"
}
```

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 1001,
    "budget_id": 1,
    "account_id": 10,
    "budget_envelope_id": 5,
    "transfer_account_id": null,
    "amount": -1500.00,
    "date": "2026-03-01T00:00:00Z"
  },
  "msg": "transaction created successfully"
}
```

**Business Rules**

- Amount cannot be zero.
- If `transfer_account_id` provided: `budget_envelope_id` must be `null`.
- If not a transfer: `budget_envelope_id` required.

**Validation Rules**

- `account_id` required.
- `amount` must be numeric and non-zero.
- `date` must be valid.
- All IDs must exist and belong to the same budget.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid payload |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Insufficient role |
| 404 | `NOT_FOUND` | Budget/account/envelope not found |
| 409 | `BUSINESS_RULE_VIOLATION` | Invalid transfer logic |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Get All Transactions

**`GET /api/v1/budgets/{budget_id}/transactions`**
**Authentication:** Required

**Optional Query Parameters**

| Parameter | Description |
|---|---|
| `account_id` | Filter by account |
| `budget_envelope_id` | Filter by envelope |
| `date_from` | Start date range |
| `date_to` | End date range |
| `page` | Page number |
| `page_size` | Results per page |

**Response — 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1001,
      "budget_id": 1,
      "account_id": 10,
      "budget_envelope_id": 5,
      "amount": -1500.00,
      "date": "2026-03-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1
  },
  "msg": "transactions fetched successfully"
}
```

> Empty collection returns `200` with `data: []`.

**Business Rules**

- Only transactions within the specified budget returned.
- Soft-deleted transactions excluded.

---

### Get Single Transaction

**`GET /api/v1/budgets/{budget_id}/transactions/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1001,
    "budget_id": 1,
    "account_id": 10,
    "budget_envelope_id": 5,
    "amount": -1500.00,
    "date": "2026-03-01T00:00:00Z"
  },
  "msg": "transaction fetched successfully"
}
```

**Business Rules**

- Transaction must belong to the specified budget.

**Error Scenarios**

| HTTP | Code |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 500 | `INTERNAL_ERROR` |

---

### Replace Transaction (Full Update)

Idempotent operation.

**`PUT /api/v1/budgets/{budget_id}/transactions/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "account_id": 10,
  "budget_envelope_id": 5,
  "amount": -2000.00,
  "date": "2026-03-02T00:00:00Z"
}
```

**Business Rules**

- Full representation required.
- Financial impact must be recalculated.
- Transfer rules enforced.

**Side Effects**

- Reverse previous transaction impact.
- Apply new transaction impact.
- Recalculate balances and envelope spent amounts.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Transaction not found |
| 409 | `CONFLICT` | Business rule violation |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Partial Update Transaction

**`PATCH /api/v1/budgets/{budget_id}/transactions/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "amount": -2500.00
}
```

**Business Rules**

- Only provided fields updated.
- Must not allow empty PATCH body.
- Financial recalculation required.

**Validation Rules**

- Amount cannot be zero.
- All IDs must belong to the same budget.

**Side Effects**

- Reverse old impact.
- Apply new impact.
- Update balances and envelope totals.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Transaction not found |
| 409 | `CONFLICT` | Business rule violation |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Delete Transaction (Soft Delete)

Idempotent operation.

**`DELETE /api/v1/budgets/{budget_id}/transactions/{id}`**
**Authentication:** Required. Role must be `OWNER`, `ADMIN`, or `EDITOR`.

**Response — 200 OK**

```json
{
  "success": true,
  "msg": "transaction deleted successfully"
}
```

**Business Rules**

- Soft delete only.
- Must reverse financial impact.
- Already deleted resource must not cause failure.

**Side Effects**

- Reverse balance impact.
- Reverse envelope spent impact.
- Mark transaction as deleted.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid ID |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Insufficient role |
| 404 | `NOT_FOUND` | Transaction not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |
