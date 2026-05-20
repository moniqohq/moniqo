# Budget API

## Overview

The Budget API manages budgeting containers within the system.

A **Budget** represents the ownership boundary (tenant) for all financial data, including:

- Accounts (ledger accounts)
- Transactions
- Budget Envelopes (concrete envelopes)
- User membership (via `BudgetUser` model)

A Budget:

- Defines a financial planning scope
- Owns ledger accounts
- Owns concrete envelopes (`BudgetEnvelope`)
- Owns transactions
- Supports multiple users
- Enforces role-based authorization

This API supports full CRUD operations and follows a standardized response structure.

**Base URL:** `/api/v1/budgets`

**Authentication:** JWT-based authentication required. OAuth may be supported in future.

---

## Domain Model — Budget

Represents a financial planning container.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial identifier |
| `title` | String | Yes | Unique budget title per user |
| `notes` | String | No | Optional description |

---

## Business Rules

### Global Rules

- All endpoints require authentication.
- Standardized response structure must be used.
- Budget is the tenant boundary.
- Authorization is evaluated per `(user_id, budget_id)`.
- `404` must not be returned for empty collections.
- Soft delete must be used where applicable.
- Operations must maintain idempotency where applicable.

### Budget-Specific Rules

- `id` is auto-generated.
- `title` must be unique per user.
- `title` length: 3–100 characters.
- `notes` maximum length: 500 characters.
- Deleting a budget must not delete historical transactions physically.
- Budget must support multiple users via membership model.

---

## Endpoints

### Create Budget

**`POST /api/v1/budgets`**
**Authentication:** Required

**Request Payload**

```json
{
  "title": "Family Budget 2026",
  "notes": "Shared household budget"
}
```

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Family Budget 2026",
    "notes": "shared household budget"
  },
  "msg": "budget created successfully"
}
```

**Business Rules**

- Title must be unique per user.
- Resource must be persisted atomically.
- Membership record must be created for creator (role: `OWNER`).

**Validation Rules**

- Missing title → 400
- Title length violation → 400

**Side Effects**

- Budget record created.
- Creator assigned `OWNER` role in membership table.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid payload |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 409 | `BUDGET_ALREADY_EXISTS` | Duplicate title |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Get All Budgets

Fetch budgets accessible to authenticated user.

**`GET /api/v1/budgets`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Family Budget 2026",
      "notes": "shared household budget"
    }
  ],
  "msg": "budgets fetched successfully"
}
```

> Returns empty result for zero budgets — no error.

**Business Rules**

- Return only budgets where user is a member.
- Soft-deleted budgets excluded.

**Error Scenarios**

| HTTP | Code |
|---|---|
| 401 | `UNAUTHORIZED` |
| 500 | `INTERNAL_ERROR` |

---

### Get Single Budget

**`GET /api/v1/budgets/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Family Budget 2026",
    "notes": "Shared household budget"
  },
  "msg": "budget fetched successfully"
}
```

**Business Rules**

- User must be a member of the budget.

**Error Scenarios**

| HTTP | Code |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |

---

### Replace Budget (Full Update)

Idempotent operation.

**`PUT /api/v1/budgets/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "title": "Updated Budget Title",
  "notes": "Updated notes"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Updated Budget Title",
    "notes": "updated notes"
  },
  "msg": "budget updated successfully"
}
```

**Business Rules**

- Complete representation required.
- Operation must be idempotent.
- Title uniqueness enforced.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Budget not found |
| 409 | `CONFLICT` | Duplicate title |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Partial Update Budget

**`PATCH /api/v1/budgets/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "notes": "Updated notes only"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Updated Budget Title",
    "notes": "Updated notes only"
  },
  "msg": "budget updated successfully"
}
```

**Business Rules**

- Only provided fields updated.
- Must not allow empty PATCH body.
- Title uniqueness enforced if updated.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Budget not found |
| 409 | `CONFLICT` | Duplicate title |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Delete Budget (Soft Delete)

Idempotent operation.

**`DELETE /api/v1/budgets/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "msg": "budget deleted successfully"
}
```

**Business Rules**

- Soft delete only.
- Must remove active membership associations.
- Historical financial data retained.
- Already deleted resource must not cause failure.
- Operation must be idempotent.

**Side Effects on Deletion**

| Entity | Action |
|---|---|
| Budget | `IsArchived = true` |
| Envelopes | `IsArchived = true` |
| Accounts | `IsArchived = true` |
| Transactions | Remain intact |
| Allocations | Remain intact |

Budget becomes inaccessible but is preserved.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid ID |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Budget not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |
