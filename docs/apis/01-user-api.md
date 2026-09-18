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
- Profile picture upload / removal
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
| `picture` | String | Yes | Server-managed avatar reference; empty string `""` when not set, never `null`. Either the relative URL `/api/v1/users/{id}/picture` (an uploaded avatar) or an absolute `https` URL (an OIDC-provided avatar). **Read-only** over this API — see [Profile Picture](#profile-picture) below; PUT/PATCH reject a non-empty value. |
| `status` | Enum | Yes | Account lifecycle state: `pending_verification` or `active` |
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
- Implementation must use **soft delete only**.
- Deleting a user will also soft delete all associated resources (e.g., envelopes, transactions, etc.).
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
    "picture": "/api/v1/users/1/picture",
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

**Editable fields:** `name`, `username`, `email`

**Request Payload**

```json
{
  "name": "Saqib Abdul",
  "username": "saqib",
  "email": "saqib@moniqo.app"
}
```

`picture` may be included as `""` for a full round-trip of a previously-fetched profile, but any other value is rejected — see [Profile Picture](#profile-picture).

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib Abdul",
    "username": "saqib",
    "email": "saqib@moniqo.app",
    "picture": "",
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
  "name": "Saqib A."
}
```

`picture` is not an accepted field on PATCH (it is rejected with a `400` validation error) — see [Profile Picture](#profile-picture).

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib A.",
    "username": "saqib",
    "email": "saqib@moniqo.app",
    "picture": "/api/v1/users/1/picture",
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

## Profile Picture

`picture` is server-managed: clients never write it via PUT/PATCH (see above). It is set only by uploading a picture, by removing one, or — for accounts created via third-party sign-in — by the identity provider at signup. Three endpoints govern it.

Clients should treat `picture` as an opaque URL and render it directly (e.g. `<img src={picture}>`), without trying to construct or parse it. Because the URL is stable across a picture change (uploading a new picture does not change the URL), a client that caches images by URL should append a cache-busting query parameter after a successful upload or removal.

### Upload Profile Picture

Uploads and replaces the authenticated user's profile picture.

**`PUT /api/v1/users/{id}/picture`**
**Authentication:** Required
**Content-Type:** `multipart/form-data`, single part named `file`

**Constraints**

- Max size: 2MB (`AVATAR_MAX_BYTES`, configurable server-side).
- Accepted image types: JPEG, PNG, WebP. The server sniffs the actual file content — the part's declared `Content-Type` is ignored — and rejects anything else (including SVG and GIF) with a `400`.

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib Abdul",
    "username": "saqib",
    "email": "saqib@moniqo.app",
    "picture": "/api/v1/users/1/picture",
    "last_login": "2026-02-23T15:04:05Z"
  },
  "msg": "profile picture updated successfully"
}
```

**Business Rules**

- Only the authenticated user may set their own picture (ownership check identical to PUT/PATCH/DELETE on the profile itself).
- Replacing an existing picture removes the old stored image.
- Uploading byte-identical content to the current picture is a safe no-op.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing `file` part, oversized file, or unsupported/undetectable image type |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Access denied (id does not match authenticated principal) |
| 404 | `NOT_FOUND` | User not found |
| 500 | `INTERNAL_ERROR` | Unexpected failure (including avatar storage being unavailable) |

---

### Get Profile Picture

Returns the raw image bytes for a user's profile picture.

**`GET /api/v1/users/{id}/picture`**
**Authentication:** **Not required.** This is the only unauthenticated endpoint in this API besides registration and login. An `<img>` tag cannot attach an `Authorization` header, and the client's access token is memory-only (never stored in a cookie), so there is no mechanism by which a browser-rendered `<img>` could authenticate this request. The accepted trade-off is that a picture is fetchable by anyone who can guess a user id — the same exposure that an OIDC-hosted avatar URL (e.g. a Google or Facebook CDN link) already has. This endpoint is rate-limited per IP to bound scraping.

**Responses**

| Status | Condition | Notes |
|---|---|---|
| 200 | A picture was uploaded via this API | Body is the raw image; `Content-Type` reflects the sniffed type from upload time; `ETag` and `Cache-Control: private, max-age=0, must-revalidate` are set |
| 304 | `If-None-Match` matches the current `ETag` | No body |
| 302 | No uploaded picture, but `picture` holds an external (OIDC) URL | `Location` header points at the external URL |
| 404 | No picture set, or the user does not exist / is deleted | Standard envelope, `"picture not found"` |

Because the URL is stable but the underlying image can change, responses are marked non-cacheable by shared caches (`private`) and rely on `ETag` revalidation rather than a long `max-age`.

---

### Remove Profile Picture

Clears the authenticated user's profile picture — idempotent operation.

**`DELETE /api/v1/users/{id}/picture`**
**Authentication:** Required

**Response — 200 OK**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Saqib Abdul",
    "username": "saqib",
    "email": "saqib@moniqo.app",
    "picture": "",
    "last_login": "2026-02-23T15:04:05Z"
  },
  "msg": "profile picture removed successfully"
}
```

**Business Rules**

- Removing an already-absent picture is a success, not an error.
- This also clears an inherited OIDC picture, not only an uploaded one — after removal, `picture` is always `""` regardless of its prior source.

**Error Scenarios**

| HTTP | Code | Description |
|---|---|---|
| 401 | `UNAUTHORIZED` | Not authenticated |
| 403 | `FORBIDDEN` | Access denied |
| 404 | `NOT_FOUND` | User not found |
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
