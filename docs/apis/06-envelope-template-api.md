# Envelope Template API

## Overview

The Envelope Template API manages reusable budgeting blueprints. Unlike other entities, it is **not tied to any budget**. Instead, it is a template to create envelopes for any budget, and these templates are available globally to every budget.

An **Envelope Template**:

- Defines a reusable financial classification (e.g., Rent, Groceries, Utilities)
- Specifies financial direction and classification (Income vs Expense)
- Optionally contains descriptive notes
- Can be used to generate actual budget envelopes for a given budget cycle
- Does not link directly to transactions
- Does not affect historical data when modified or deleted

This API supports full CRUD operations and follows a standardized response structure.

**Base URL:** `/api/v1/templates/envelopes`

**Authentication:** JWT-based authentication required. OAuth may be supported in the future.

---

## Domain Model — EnvelopeTemplate

Represents a reusable budgeting blueprint.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Unique identifier (auto-generated) |
| `title` | String | Yes | Unique name of template |
| `type` | Enum | Yes | Classification of envelope (`expense`, `income`) |
| `nature` | Enum | Yes | Financial direction (`want`, `should`, `need`, `must`) |
| `notes` | String | No | Specific notes for this envelope template |

### Enumerations

> The API exposes domain-expressive values. Internal encodings must **not** leak into the API.

**`type`**

| API Value | Internal |
|---|---|
| `expense` | `E` |
| `income` | `I` |

**`nature`**

| API Value | Internal |
|---|---|
| `want` | `W` |
| `should` | `S` |
| `need` | `N` |
| `must` | `M` |

---

## Business Rules

### Global Rules

- All endpoints require authentication.
- Standardized response structure must be used.
- API must not expose internal enum encoding.
- `404` must not be returned for empty collections.
- Soft delete must be used for delete operations.
- Operations must maintain idempotency where applicable.

### EnvelopeTemplate-Specific Rules

- `id` is auto-generated (serial integer).
- `title` must be unique per envelope template.
- `title` length: 5–80 characters.
- `notes` maximum length: 140 characters.
- `type` must be one of the allowed enum values.
- `nature` must be one of the allowed enum values.
- Deleting a template does not affect existing envelopes created from it.
- Templates are not linked to transactions.
- Soft-deleted templates:
  - Are excluded from normal queries.
  - Cannot be reused.
  - Are retained for audit and integrity.

---

## Endpoints

### Create Envelope Template

**`POST /api/v1/templates/envelopes`**
**Authentication:** Required

**Request Payload**

```json
{
  "title": "Monthly Rent",
  "type": "expense",
  "nature": "must",
  "notes": "recurring house rent"
}
```

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "title": "Monthly Rent",
    "type": "expense",
    "nature": "must",
    "notes": "Recurring house rent"
  },
  "msg": "envelope template created"
}
```

**Business Rules**

- Title must be unique per envelope template.
- Resource must be persisted atomically.
- ID is system-generated.

**Validation Rules**

- Missing required fields → 400
- Invalid enum values → 400
- Title length violation → 400
- Notes length > 140 → 400

**Side Effects**

- New template record is created.
- Audit metadata may be recorded (`created_at`, `created_by`).

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid payload |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 409 | `TEMPLATE_ALREADY_EXISTS` | Duplicate title |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Get All Templates

**`GET /api/v1/templates/envelopes`**
**Authentication:** Required

**Optional Query Parameters**

| Parameter | Description |
|---|---|
| `type` | Filter by type (`expense` or `income`) |
| `nature` | Filter by nature |
| `page` | Page number |
| `page_size` | Results per page |

**Example Request**

```
GET /api/v1/templates/envelopes?type=expense&page=1&page_size=20
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": [
    {
      "id": 101,
      "title": "Monthly Rent",
      "type": "expense",
      "nature": "must",
      "notes": "recurring house rent"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1
  },
  "msg": "envelope templates fetched successfully"
}
```

**Empty Collection Response**

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0
  },
  "msg": "envelope templates fetched successfully"
}
```

> ⚠️ Never return `404` for an empty collection.

**Business Rules**

- Only non-soft-deleted records are returned.
- Pagination defaults may apply.

**Validation Rules**

- Invalid enum filters → 400
- Invalid pagination parameters → apply defaults

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Get Single Template

**`GET /api/v1/templates/envelopes/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "title": "Monthly Rent",
    "type": "expense",
    "nature": "must",
    "notes": "recurring house rent"
  },
  "msg": "envelope template fetched successfully"
}
```

**Business Rules**

- Only non-soft-deleted template can be retrieved.

**Validation Rules**

- ID must be a valid integer.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid ID |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Template not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Replace Template (Full Update)

Idempotent operation.

**`PUT /api/v1/templates/envelopes/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "title": "Updated Rent",
  "type": "expense",
  "nature": "must",
  "notes": "updated recurring house rent"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "title": "Updated Rent",
    "type": "expense",
    "nature": "must",
    "notes": "updated recurring house rent"
  },
  "msg": "envelope template updated successfully"
}
```

**Business Rules**

- Complete representation required.
- Duplicate title check must be enforced.
- Operation must be idempotent.

**Validation Rules**

- All required fields must be present.
- Enum validation required.
- Title uniqueness must be validated.

**Side Effects**

- Record updated.
- Audit metadata updated (`updated_at`).

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Template not found |
| 409 | `CONFLICT` | Duplicate title |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Partial Update Template

**`PATCH /api/v1/templates/envelopes/{id}`**
**Authentication:** Required

**Request Payload**

```json
{
  "notes": "updated notes only"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 101,
    "title": "Monthly Rent",
    "type": "expense",
    "nature": "must",
    "notes": "updated notes only"
  },
  "msg": "envelope template updated successfully"
}
```

**Business Rules**

- Only provided fields are updated.
- Omitted fields remain unchanged.
- Must not allow empty PATCH body.

**Validation Rules**

- If provided, fields must pass validation.
- Title uniqueness enforced if title is updated.

**Side Effects**

- Partial record updated.
- Audit metadata updated (`updated_at`).

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Template not found |
| 409 | `CONFLICT` | Duplicate title |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

#### Why Empty PATCH Body is Not Allowed

`PATCH` is defined as a partial modification of a resource. An empty payload means "update nothing", which is problematic:

- **Ambiguous intent** — is the client trying to update something but failed to include fields, perform a no-op, or test connectivity?
- **Breaks contract clarity** — `PATCH` implies modification; an empty object does not modify anything.
- **Validation hygiene** — a partial update must contain at least one valid updatable field.

**Response for empty PATCH body — 400 Bad Request**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "At least one updatable field must be provided"
  }
}
```

---

### Delete Template (Soft Delete)

Idempotent operation.

**`DELETE /api/v1/templates/envelopes/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "msg": "envelope template deleted successfully"
}
```

**Business Rules**

- Soft delete only (e.g., `deleted_at` timestamp).
- Already deleted resource must not cause failure.
- Cannot affect historical envelopes.
- Must be excluded from normal queries after deletion.

**Validation Rules**

- ID must be a valid integer.

**Side Effects**

- Template marked as deleted.
- Audit metadata recorded (`updated_at`, `deleted_at`).

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid ID |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | Template not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

#### Why Already-Deleted Must Not Cause Failure

`DELETE` expresses: *"Ensure this resource does not exist."* — not *"Delete it only if it currently exists."*

Returning `404` on a second delete makes the operation non-idempotent from the client's perspective. Clients may legitimately send `DELETE` twice due to network retries, timeouts, mobile reconnections, or load balancer retries. A second call must not return an error.
