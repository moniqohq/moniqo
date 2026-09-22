# User API

## Overview

The User API manages authenticated identities within the system. It provides endpoints for registration, authentication context handling, profile management, and account lifecycle operations.

A **User**:

- Owns domain resources (envelopes, transactions, templates, budgets)
- Authenticates into the system
- Maintains profile data
- Represents a security principal in the authorization model

The architecture supports multi-user collaboration with role-based access control across budgets.

### Core Capabilities

The API supports:

- User registration
- Profile retrieval
- Full profile replacement
- Partial profile update
- Password change (authenticated)
- Account deletion

> Unless explicitly stated, all endpoints require authentication.

**Base URL:** `/api/v1/users`

---

## Domain Model — User

Represents an authenticated identity in the system.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial numeric ID |
| `name` | String | No | Real name of the user (max 100 chars) |
| `username` | String | Yes | Unique username (8–12 chars, see constraints) |
| `hash` | String | No | bcrypt password hash — absent for accounts created via third-party (OIDC) sign-in with no password set; **never returned in any response regardless** |
| `email` | String | Yes | Unique email address (RFC 5321, required at registration) |
| `picture` | String | Yes | Avatar reference; empty string `""` when not set, never `null` |
| `status` | Enum | Yes | Account lifecycle state: `pending_verification` or `active` |
| `currency` | String | No | Display currency, ISO-4217 code (one of `INR`, `USD`, `EUR`, `GBP`, `AUD`, `CAD`, `SGD`); `null` until set |
| `timezone` | String | No | Display timezone, IANA name (e.g. `Asia/Kolkata`); `null` until set |
| `date_format` | String | No | Display date format, one of `MMM DD, YYYY`, `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`; `null` until set |
| `last_login` | Timestamp | No | Most recent successful authentication; `null` before first login |
| `created_at` | Timestamp | Yes | Server-side creation timestamp |
| `updated_at` | Timestamp | Yes | Last modification timestamp (internal audit, never returned) |
| `deleted_at` | Timestamp | No | Soft-delete timestamp (internal audit, never returned) |

> `hash`, `updated_at`, and `deleted_at` are stripped at the serialization boundary and never appear in any API response — not as a field, not as `null`.

### Account Lifecycle

| Status | Meaning |
|---|---|
| `pending_verification` | Account created; email not yet verified; cannot authenticate |
| `active` | Email verified; can authenticate |

Registration always produces `pending_verification`. Email verification is handled by a separate flow.

### Security Constraints

- `hash` stores a bcrypt password hash at cost factor 12 (configurable via `BCRYPT_COST` env var).
- Raw passwords are never stored or logged.
- `hash` must never be returned in any API response.
- Even when fields are empty, they must be included in responses (`null` or empty string as appropriate).
- Password reset for unauthenticated users is handled in a separate flow.

---

## Business Rules

### Global Rules

- All endpoints require authentication except registration, login, and password reset.
- Standardized response structure must be used.
- `hash` must never appear in any API response.
- Resource ownership validation must be enforced.
- Operations modifying user data must update audit metadata.
- API must remain forward-compatible for multi-user architecture.

### User-Specific Rules

- `id` is numeric, serial, auto-generated.
- `username` must be unique (case-insensitive, uniqueness enforced on soft-deleted records too).
- `username` constraints:
  - Must start with a letter (`a-z`, `A-Z`)
  - Alphanumeric body; hyphens (`-`) and underscores (`_`) allowed as inner separators
  - Cannot start or end with `-` or `_`; no consecutive separators
  - Minimum length: 8 characters; maximum length: 12 characters
  - Note: `^` is no longer a valid character (removed for stricter validation)
- `email` is required and must be unique globally (including soft-deleted accounts).
- Uniqueness for both `username` and `email` is enforced at the database level via unique indexes, not application-level check-then-insert.

### Security Rules

- Password must be hashed using bcrypt before storage.
- Password changes require:
  - `current_password`
  - `new_password`
  - Server-side verification of current password
- Password updates apply only to authenticated users.
- Unauthenticated password reset handled separately.

### Deletion Rules

- Deleting user removes access to all owned resources.
- Implementation must use **soft delete only** — the user row is marked
  `deleted_at`, never physically removed. Username and email remain
  permanently reserved (uniqueness is enforced including soft-deleted rows),
  so a deleted account's username/email cannot be re-registered.
- Deletion requires re-authentication with the user's current password.
  Accounts with no password credential (OIDC-only signups) cannot delete
  themselves until they set one (`409`).
- If the user is the sole `OWNER` of a budget that still has other active
  members, deletion is blocked (`409`) until ownership is transferred (see
  `POST /api/v1/budgets/{id}/transfer-ownership` in the Budget API) or the
  other members are removed. This never happens implicitly.
- Budgets the user solely owns (no other active members) are soft-deleted
  along with their memberships, mirroring `DELETE /api/v1/budgets/{id}`.
  Their accounts, envelopes, and transactions are **not** touched by this
  operation — same as budget deletion, financial data remains preserved for
  audit and only becomes unreachable because the containing budget is gone.
- The user's memberships in budgets that survive (i.e. budgets they don't
  solely own) are soft-deleted; the budget and its data are untouched, and
  other members are unaffected.
- Operation must be idempotent.

---

## Endpoints

### Register User

Creates a new user account. This is the entry point into the system — no authentication required.

**`POST /api/v1/users`**
**Authentication:** Not required
**Rate limit:** 10 requests per IP per minute

**Request Payload**

```json
{
  "username": "saqibtest",
  "password": "securePassword123",
  "name": "Saqib Abdul",
  "email": "saqib@example.com"
}
```

| Field | Required | Constraints |
|---|---|---|
| `username` | Yes | 8–12 chars; starts with a letter; alphanumeric + inner `-`/`_` only |
| `password` | Yes | 8–72 bytes (bcrypt truncates beyond 72) |
| `email` | Yes | RFC 5321 format; max 254 chars |
| `name` | No | If provided, non-empty string; max 100 chars |

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib Abdul",
    "username": "saqibtest",
    "email": "saqib@example.com",
    "picture": "",
    "status": "pending_verification",
    "last_login": null,
    "created_at": "2026-06-05T12:00:00Z"
  },
  "msg": "user created successfully"
}
```

> `hash`, `updated_at`, and `deleted_at` are never present in this or any other response.

**Business Rules**

- Username uniqueness enforced globally, including soft-deleted accounts.
- Email uniqueness enforced globally, including soft-deleted accounts.
- Password hashed with bcrypt at cost factor 12 (configurable via `BCRYPT_COST`).
- `status` is always `pending_verification` on creation.
- `last_login` is always `null` on creation.
- `picture` is always `""` (empty string) when not set, never `null`.
- All writes occur within a single DB transaction; any failure rolls back.
- Concurrent duplicate registrations: exactly one request succeeds with `201`; the rest receive `409`.

**Validation Error Format**

Validation failures return `400` with field-level details:

```json
{
  "success": false,
  "data": {
    "fields": [
      { "field": "username", "error": "must be between 8 and 12 characters" },
      { "field": "email", "error": "invalid email format" }
    ]
  },
  "msg": "validation failed"
}
```

All field errors are aggregated and returned in a single response.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid input; `data.fields` contains per-field errors |
| 409 | `CONFLICT` | `"username or email already exists"` (generic; does not reveal which field) |
| 429 | `RATE_LIMITED` | Too many requests from this IP |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Get User Profile

Returns authenticated user's profile.

**`GET /api/v1/users/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib Abdul",
    "username": "saqib",
    "email": "saqib@example.com",
    "picture": "https://cdn.moniqo.app/avatar.png",
    "last_login": "2026-02-23T15:04:05Z"
  },
  "msg": "user fetched successfully"
}
```

**Business Rules**

- User can only access own profile (unless future admin role exists).
- `hash` must never be exposed.

**Validation Rules**

- ID must be valid.
- Authorization must pass.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Access denied |
| 404 | `NOT_FOUND` | User not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Replace User (Full Update)

Replaces editable user fields — idempotent operation.

**`PUT /api/v1/users/{id}`**
**Authentication:** Required

**Editable fields:** `name`, `username`, `email`, `picture`, `currency`, `timezone`, `date_format`

`currency`, `timezone`, and `date_format` are true full-replace fields: omitting them (or sending `null`) clears the preference, same as omitting `name`.

**Request Payload**

```json
{
  "name": "Saqib Abdul",
  "username": "saqib",
  "email": "saqib@moniqo.app",
  "picture": "https://cdn.moniqo.app/new-avatar.png",
  "currency": "USD",
  "timezone": "America/New_York",
  "date_format": "YYYY-MM-DD"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib Abdul",
    "username": "saqib",
    "email": "saqib@moniqo.app",
    "picture": "https://cdn.moniqo.app/new-avatar.png",
    "currency": "USD",
    "timezone": "America/New_York",
    "date_format": "YYYY-MM-DD",
    "last_login": "2026-02-23T15:04:05Z"
  },
  "msg": "user updated successfully"
}
```

**Business Rules**

- Full representation required.
- Only OWNER can modify other user's profile belonging to budget OWNER belongs.
- Username uniqueness must be re-validated.
- Operation must be idempotent.

**Validation Rules**

- Username constraints enforced.
- Email format validation.
- Unique constraints enforced.
- `currency`, if provided, must be one of the supported ISO-4217 codes.
- `timezone`, if provided, must be a valid IANA timezone name.
- `date_format`, if provided, must be one of the supported format tokens.

**Side Effects**

- Profile updated.
- Audit metadata updated.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 404 | `NOT_FOUND` | User not found |
| 409 | `CONFLICT` | Duplicate username/email |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Partial Update User

Updates specific fields only.

**`PATCH /api/v1/users/{id}`**
**Authentication:** Required

**Editable fields:** any of `name`, `username`, `email`, `picture`, `currency`, `timezone`, `date_format`, plus the password-change pair below. Only fields present in the body are applied.

**Request Payload**

```json
{
  "picture": "https://cdn.moniqo.app/avatar-2.png"
}
```

**Request Payload — preferences only**

```json
{
  "currency": "USD",
  "timezone": "America/New_York",
  "date_format": "YYYY-MM-DD"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib Abdul",
    "username": "saqib",
    "email": "saqib@moniqo.app",
    "picture": "https://cdn.moniqo.app/avatar-2.png",
    "last_login": "2026-02-23T15:04:05Z"
  },
  "msg": "user updated successfully"
}
```

#### Special Case: Password Change (Authenticated Only)

If password update is requested:

```json
{
  "current_password": "oldPassword",
  "new_password": "newSecurePassword"
}
```

**Rules:**

- `current_password` must be provided.
- Server must verify it.
- New password hashed and stored.
- New password validated.
- `hash` never returned.

**Business Rules**

- Must not allow empty PATCH body.
- Only OWNER can modify other user's profile belonging to budget OWNER belongs.
- Only provided fields are updated.
- Password change requires current password.

**Validation Rules**

- Username rules enforced if updated.
- Email format validation.
- Password strength validation.
- `currency`, if provided, must be one of the supported ISO-4217 codes (`INR`, `USD`, `EUR`, `GBP`, `AUD`, `CAD`, `SGD`).
- `timezone`, if provided, must be a valid IANA timezone name.
- `date_format`, if provided, must be one of `MMM DD, YYYY`, `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY-MM-DD`.

**Side Effects**

- Selected fields updated.
- Password rehashed (if applicable).
- Audit metadata updated.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid or missing field |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Password verification failed |
| 404 | `NOT_FOUND` | User not found |
| 409 | `CONFLICT` | Duplicate username/email |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### Delete User

Permanently (soft-)deletes the authenticated user's own account — idempotent
operation. This is a self-service endpoint only: a user can delete their own
account, never another user's.

**`DELETE /api/v1/users/{id}`**
**Authentication:** Required

**Request Body**

```json
{
  "current_password": "string, required"
}
```

**Response — 200 OK**

```json
{
  "success": true,
  "data": null,
  "msg": "user deleted successfully"
}
```

**Business Rules**

- Must verify ownership — the `{id}` path param must match the authenticated
  principal; there is no cross-user or admin deletion path on this endpoint.
- Requires re-authentication via `current_password`.
- Operation must be idempotent — already-deleted user must not cause failure.
- All sessions/tokens must be invalidated.
- Blocked if the user is the sole `OWNER` of a shared budget (see Deletion
  Rules above).

**Validation Rules**

- Authorization required.
- ID must match authenticated principal.
- `current_password` is required, non-empty, and at most 72 characters
  (bcrypt limit).

**Side Effects**

- User marked deleted (soft delete).
- All refresh tokens revoked and the caller's current access token
  blocklisted — no existing session or token remains usable.
- Pending password-reset tokens invalidated.
- Linked OIDC identities (Google/Apple/Facebook) removed, so a future
  sign-in with the same provider account creates a new user rather than
  resolving to this deleted row.
- Budgets solely owned by the user are soft-deleted along with their
  memberships (see Deletion Rules). Budgets shared with other members, and
  their data, are left untouched; only the deleted user's own membership in
  them is soft-deleted.

**Deletion Scenarios**

- **Single owner, no other members:** The budget and its memberships are
  soft-deleted as part of account deletion.
- **Single owner, other members present:** Deletion is blocked (`409`) —
  the caller must transfer ownership or remove the other members first.
- **Not the sole owner (ADMIN/EDITOR/VIEWER, or one of several owners):**
  the budget is unaffected; only the deleted user's membership is removed.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing or invalid `current_password` |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Access denied — id mismatch, or wrong password |
| 409 | `CONFLICT` | No password credential set (OIDC-only account), or sole owner of a shared budget |
| 500 | `INTERNAL_ERROR` | Unexpected failure |
