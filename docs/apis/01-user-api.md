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
| `name` | String | No | Real name of the user |
| `username` | String | Yes | Unique username |
| `hash` | String | Yes | bcrypt password hash (never exposed) |
| `email` | String | No | Unique email address |
| `picture` | String | No | Stored avatar reference (URL or server UUID) |
| `last_login` | Time | No | Timestamp of most recent successful authentication |

### Security Constraints

- `hash` stores a bcrypt password hash.
- Raw passwords are never stored.
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
- `username` must be unique.
- `username` constraints:
  - Alphanumeric
  - May contain `_`, `-`, `^`
  - Cannot start with a number
  - Maximum length: 12 characters
- `email` must be unique if provided.

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
- Implementation must use **soft delete only**.
- Deleting a user will also soft delete all associated resources (e.g., envelopes, transactions, etc.).
- Operation must be idempotent.

---

## Endpoints

### Register User

Creates a new user account.

**`POST /api/v1/users`**
**Authentication:** Not required

**Request Payload**

```json
{
  "username": "saqib",
  "password": "securePassword123",
  "name": "Saqib Abdul",
  "email": "saqib@example.com"
}
```

**Response — 201 Created**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib Abdul",
    "username": "saqib",
    "email": "saqib@example.com",
    "picture": "",
    "last_login": null
  },
  "msg": "user created successfully"
}
```

> ⚠️ `hash` is never returned.

**Business Rules**

- Username uniqueness enforced.
- Email uniqueness enforced (if provided).
- Password must be hashed before persistence.

**Validation Rules**

- Username format validation.
- Username length ≤ 12.
- Password minimum strength rules.
- Valid email format (if provided).

**Side Effects**

- User record created.
- Password hashed and stored.
- Initial `last_login = null`.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 409 | `CONFLICT` | Username or email exists |
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

**Editable fields:** `name`, `username`, `email`, `picture`

**Request Payload**

```json
{
  "name": "Saqib Abdul",
  "username": "saqib",
  "email": "saqib@moniqo.app",
  "picture": "https://cdn.moniqo.app/new-avatar.png"
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

**Request Payload**

```json
{
  "picture": "https://cdn.moniqo.app/avatar-2.png"
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

Deletes authenticated user account — idempotent operation.

**`DELETE /api/v1/users/{id}`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "msg": "user deleted successfully"
}
```

**Business Rules**

- Must verify ownership.
- Operation must be idempotent.
- Only OWNER can unlink/delete other user's profile from budget belonging to budget OWNER belongs.
- Already-deleted user must not cause failure.
- All sessions/tokens must be invalidated.

**Validation Rules**

- Authorization required.
- ID must match authenticated principal.

**Side Effects**

- User marked deleted (soft delete).
- Access revoked.
- Tokens invalidated.
- All associated entities (transactions, envelopes) become inaccessible but are not directly changed. Accessibility is gated by checking if the user is deleted before fetching.

**Deletion Scenarios**

- **Single owner:** When deleting a user who is the sole owner, everything associated is deleted and unrecoverable — equivalent to deleting an account from a software service.
- **Multiple users:** The deleting owner has the option to transfer ownership or delete everything. The deleting user must be the owner to choose another user.
- **Writer or Viewer:** If a writer or viewer deletes their account, nothing is affected as long as another owner is already defined.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Access denied |
| 500 | `INTERNAL_ERROR` | Unexpected failure |
