# Budget Envelope API

## Overview

The Budget Envelope API manages concrete envelopes within a specific budget.

A **BudgetEnvelope** is:

- Scoped to a single budget
- Used for actual allocation and tracking
- Linked to transactions
- Responsible for tracking allocated and spent amounts

A BudgetEnvelope:

- Defines a spending category within a budget
- Tracks allocated amount
- Tracks spent amount (derived from transactions)
- Can be created manually or from a template
- Cannot exist outside a budget

This API supports full CRUD operations for Budget Envelopes.

**Base URL:** `/api/v1/budgets/{budget_id}/envelopes`

**Authentication:** JWT authentication required. User must be a member of the specified budget. Authorization evaluated per role within that budget.

---

## Domain Model — BudgetEnvelope

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial identifier |
| `title` | String | Yes | Unique envelope name within the budget |
| `budget_id` | Integer | Yes | Foreign key referencing Budget |
| `allocated_amt` | Decimal | Yes | Amount allocated to this envelope |
| `spent_amt` | Decimal | Yes | System-calculated total spent |
| `description` | String | No | Optional descriptive text |
| `is_archived` | Boolean | Yes | `true` when the envelope has been soft-deleted (archived); historical transactions remain intact |

---

## Business Rules

### Global Rules

- All endpoints require authentication.
- User must be a member of the specified budget.
- Authorization evaluated per `(user_id, budget_id)`.
- All queries must include `WHERE budget_id = ?`.
- `404` must not be returned for empty collections.
- Soft delete must be used.
- API must not allow modification of system-calculated fields.
- Idempotency must be maintained where applicable.

### BudgetEnvelope-Specific Rules

- `id` is auto-generated.
- `title` must be unique within a budget.
- `allocated_amt` must be ≥ 0.
- `spent_amt` is calculated from transactions and cannot be manually modified.
- Envelope must belong to a valid budget.
- Deleting an envelope must not delete historical transactions.
- Soft-deleted envelopes must be excluded from standard queries.

---

## Endpoints

### Create Budget Envelope

**`POST /api/v1/budgets/{budget_id}/envelopes`**
**Authentication:** Required. Role must be `OWNER`, `ADMIN`, or `EDITOR`.

**Request Payload**

```json
{
  "title": "Groceries",
  "allocated_amt": 5000.00,
  "description": "Monthly grocery expenses"
}
```

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "title": "Groceries",
    "budget_id": 1,
    "allocated_amt": 5000.00,
    "spent_amt": 0.00,
    "description": "Monthly grocery expenses",
    "is_archived": false
  },
  "msg": "budget envelope created successfully"
}
```

**Business Rules**

- Title must be unique within budget.
- `allocated_amt` initializes budget planning.
- `spent_amt` starts at 0.

**Validation Rules**

- `title` required (3–80 characters).
- `allocated_amt` must be numeric and ≥ 0.
- `budget_id` must exist.
- User must have write permission.

**Side Effects**

- New envelope row created.
- Budget allocation totals may be recalculated.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid payload |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Insufficient role |
| 404 | `NOT_FOUND` | Budget not found |
| 409 | `CONFLICT` | Duplicate envelope title |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Get All Budget Envelopes

**`GET /api/v1/budgets/{budget_id}/envelopes`**
**Authentication:** Required

**Query Parameters**

| Param | Values | Default | Description |
|---|---|---|---|
| `status` | `active`, `archived`, `all` | `active` | Filters by archived (soft-deleted) state. `active` returns non-archived envelopes only, `archived` returns only archived envelopes, `all` returns both. |

**Response — 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "title": "Groceries",
      "budget_id": 1,
      "allocated_amt": 5000.00,
      "spent_amt": 1200.00,
      "description": "Monthly grocery expenses",
      "is_archived": false
    }
  ],
  "msg": "budget envelopes fetched successfully"
}
```

> Do not return an error for empty envelopes — return an empty response with a success status code.

**Business Rules**

- Only envelopes within the specified budget are returned.
- Default (`status=active` or omitted) excludes soft-deleted (archived) envelopes.
- `status=archived` returns only soft-deleted (archived) envelopes; `status=all` returns both.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid `status` value |
| 401 | `UNAUTHORIZED` | |
| 403 | `FORBIDDEN` | |
| 404 | `NOT_FOUND` | |
| 500 | `INTERNAL_ERROR` | |

---

### Get Single Budget Envelope

**`GET /api/v1/budgets/{budget_id}/envelopes/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "title": "Groceries",
    "budget_id": 1,
    "allocated_amt": 5000.00,
    "spent_amt": 1200.00,
    "description": "Monthly grocery expenses",
    "is_archived": false
  },
  "msg": "budget envelope fetched successfully"
}
```

**Business Rules**

- Envelope must belong to the specified budget.
- User must be authenticated and authorized for the budget.
- Soft-deleted envelope returns 404.

**Validation Rules**

- ID must be a valid integer.

**Error Scenarios**

| HTTP | Code |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 500 | `INTERNAL_ERROR` |

---

### Replace Budget Envelope (Full Update)

Idempotent operation.

**`PUT /api/v1/budgets/{budget_id}/envelopes/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "title": "Groceries",
  "allocated_amt": 6000.00,
  "description": "Updated description"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "title": "Groceries",
    "budget_id": 1,
    "allocated_amt": 6000.00,
    "spent_amt": 1200.00,
    "description": "Updated description",
    "is_archived": false
  },
  "msg": "budget envelope updated successfully"
}
```

**Business Rules**

- Complete representation required.
- `spent_amt` cannot be modified.
- Title uniqueness enforced.
- `allocated_amt` must be ≥ `spent_amt` (optional strict rule).

**Validation Rules**

- All required fields present.
- `allocated_amt` must be ≥ 0.

**Side Effects**

- Allocation totals recalculated.
- Budget summary may update.

**Error Scenarios**

| HTTP | Code |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 500 | `INTERNAL_ERROR` |

---

### Partial Update Budget Envelope

**`PATCH /api/v1/budgets/{budget_id}/envelopes/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "allocated_amt": 7000.00
}
```

**Business Rules**

- Only provided fields updated.
- Must not allow empty PATCH body.
- `spent_amt` cannot be modified.
- `allocated_amt` must not be less than `spent_amt`.

**Validation Rules**

- If provided, fields must pass validation.
- Empty payload → 400.

**Side Effects**

- Allocation totals recalculated.

**Error Scenarios**

| HTTP | Code |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 500 | `INTERNAL_ERROR` |

---

### Delete Budget Envelope (Soft Delete)

Idempotent operation.

**`DELETE /api/v1/budgets/{budget_id}/envelopes/{id}`**
**Authentication:** Required. Role must be `OWNER` or `ADMIN`.

**Response — 200 OK**

```json
{
  "success": true,
  "msg": "budget envelope deleted successfully"
}
```

**Business Rules**

- Soft delete only.
- Cannot physically delete if transactions reference it.
- Already deleted resource must not cause failure.

**Validation Rules**

- Valid ID required.
- Budget membership required.

**Side Effects**

- Envelope marked deleted.
- Excluded from future queries.
- Historical transactions preserved.

**Error Scenarios**

| HTTP | Code |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 500 | `INTERNAL_ERROR` |

---

## Deletion Scenarios

### Case A — Envelope Has Never Been Used

Conditions: No transactions linked, no allocations made, no historical balance.

- ✔ Hard delete is safe
- ✔ No side effects

### Case B — Envelope Has Allocations but No Transactions

Money was assigned but never spent.

**Before deletion:**

- Move remaining balance back to "To Be Budgeted" (recommended) or parent envelope (if hierarchical).
- Remove allocation history for current period.
- Preserve audit log entry.

Then perform soft delete or archive.

> Deleting without redistributing creates "ghost money".

### Case C — Envelope Has Transactions (Most Important)

> ⚠️ You should **not** soft delete transactions when you soft delete (archive) a `BudgetEnvelope`. That would violate core ledger invariants.

In a ledger-based system:

- **Transactions represent historical truth.**
- **Envelopes represent classification / intent.**

Archiving an envelope means: *"This category is no longer active for future planning."*

It does **not** mean: *"These past financial events didn't happen."*

**If you soft delete transactions:**

- ❌ Account balances will change
- ❌ Monthly reports will change
- ❌ Reconciliation breaks
- ❌ Audit trail becomes unreliable
- ❌ Temporal inconsistency is introduced

**Correct behavior when hiding (archiving) a category:**

- Past transactions remain untouched.
- Historical reports still show that category.
- Only future usage is blocked.
