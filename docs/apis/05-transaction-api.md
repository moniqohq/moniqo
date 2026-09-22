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

## Validation Error Format

A `400 VALIDATION_ERROR` response names every field that failed and why, aggregated in a single response — the same envelope used by every other endpoint in this API:

```json
{
  "success": false,
  "data": {
    "fields": [
      { "field": "account_id", "error": "must be a JSON integer (received \"10\")" },
      { "field": "amount", "error": "must be a JSON number in major units, e.g. 12.34 (received \"1500\")" },
      { "field": "date", "error": "must be an RFC 3339 timestamp, e.g. 2026-03-01T00:00:00Z (received \"01-03-2026\")" }
    ]
  },
  "msg": "validation failed"
}
```

- A field that fails to decode (wrong JSON type, e.g. a string where a number is expected) is reported with the value that was received.
- A field that decodes but fails a domain rule (e.g. `amount: 0`, or `budget_envelope_id` set alongside `transfer_account_id`) is reported with the rule that was violated.
- All failures across all fields are returned together in one response, not one at a time.
- A `409 BUSINESS_RULE_VIOLATION` conflict (e.g. self-transfer) uses the same envelope with `data: null` and a specific `msg` naming the offending field and rule instead of a generic message.

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
    "date": "2026-03-01T00:00:00Z",
    "status": "uncleared"
  },
  "msg": "transaction created successfully"
}
```

**Business Rules**

- Amount cannot be zero.
- If `transfer_account_id` provided: `budget_envelope_id` must be `null`.
- If not a transfer: `budget_envelope_id` required.
- Rejected if `account_id` (or, for transfers, either leg's account) refers to an archived account — archived accounts are read-only.

**Validation Rules**

- `account_id` required.
- `amount` must be numeric and non-zero.
- `date` must be valid.
- All IDs must exist and belong to the same budget.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid payload, or `account_id`/`transfer_account_id` refers to an archived account |
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
| `account_id` | Filter by account. When the account is archived, its transactions are still returned — an explicit `account_id` bypasses the archived-account exclusion below. |
| `budget_envelope_id` | Filter by envelope |
| `date_from` | Start date range |
| `date_to` | End date range |
| `include_archived` | `true` to include transactions belonging to archived accounts budget-wide (default `false`) |
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
      "date": "2026-03-01T00:00:00Z",
      "status": "uncleared"
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
- Transactions belonging to archived accounts are excluded by default, unless the request sets an explicit `account_id` for that account or passes `include_archived=true`.

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
    "date": "2026-03-01T00:00:00Z",
    "status": "uncleared"
  },
  "msg": "transaction fetched successfully"
}
```

**Business Rules**

- Transaction must belong to the specified budget.
- Direct lookup by ID is never filtered by the owning account's archived state — deep links and audit trails must resolve regardless.

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
- `status` follows full-replace semantics: omitting it resets the transaction to `uncleared`, even if it
  was previously `cleared` or `reconciled`. Send the current `status` explicitly to preserve it.
- For transfers, `status` is applied to both legs so they never disagree on clearing state.
- Rejected if `account_id` refers to an archived account.

**Side Effects**

- Reverse previous transaction impact.
- Apply new transaction impact.
- Recalculate balances and envelope spent amounts.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing field, or `account_id` refers to an archived account |
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
- Rejected if the patch would move the transaction onto an archived account.

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
| 400 | `VALIDATION_ERROR` | Invalid field, or `account_id` refers to an archived account |
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
- Rejected if the transaction's account has transaction locking enabled (`is_immutable`).

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
| 409 | `CONFLICT` | Account has transaction locking enabled |
| 500 | `INTERNAL_ERROR` | Unexpected failure |
