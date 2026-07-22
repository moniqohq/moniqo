# Third-Party Authentication API (OpenID Connect)

## Overview

Moniqo supports signing in with a third-party **OpenID Connect (OIDC)** identity provider — Google, Apple ("Sign in with Apple"), and Facebook (via its Limited Login OIDC-shaped ID token) — as an alternative and complement to password-based login. A user may link multiple providers to a single Moniqo account.

The implementation is provider-agnostic (Strategy pattern): the auth service and HTTP handlers depend only on an `IdentityProvider` interface resolved from a `ProviderRegistry`, never on provider-specific logic. Adding a future provider (e.g. Microsoft) requires only a new provider package and one `Register()` call at startup — no handler, service, or router changes.

**Base URL:** `/api/v1/auth`

> This document, together with `01-user-api.md`, is the source of truth for the User/Auth domain's third-party login contract. It complements — and does not replace — the existing password-based `/api/v1/auth/login`, `/refresh`, `/logout`, and `/password-reset*` endpoints.

---

## Domain Model — UserIdentity

A linked third-party identity, one row per (provider, Moniqo user) pair. A user may have several — one per provider they've linked.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial numeric ID |
| `user_id` | Integer | Yes | The Moniqo user this identity is linked to |
| `provider` | String | Yes | `google`, `apple`, or `facebook` |
| `provider_subject` | String | Yes | The provider's stable, unique subject identifier (`sub` claim) |
| `provider_email` | String | No | The email the provider asserted at link time (informational only) |
| `created_at` | Timestamp | Yes | When the identity was linked |
| `updated_at` | Timestamp | Yes | Last modification timestamp |

Unique constraint: `(provider, provider_subject)` — the same provider account can never be linked to two different Moniqo users.

Moniqo never persists OAuth access or refresh tokens from the identity provider — only the local Moniqo JWT/refresh token pair is issued and stored, exactly as for password login.

Related change to the `users` table: `hash` is nullable. An account created purely via OIDC (no password ever set) has `hash = NULL`; see `01-user-api.md`'s Domain Model for the updated field table.

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/auth/login/:provider` | None | Begins the login flow: redirects to the provider |
| `GET`, `POST` | `/api/v1/auth/callback/:provider` | None | The provider's redirect back to Moniqo — see note below |
| `POST` | `/api/v1/auth/link/:provider` | Required | Begins linking `:provider` to the authenticated account |
| `DELETE` | `/api/v1/auth/link/:provider` | Required | Unlinks `:provider` from the authenticated account |

`:provider` is one of `google`, `apple`, `facebook` — resolved dynamically from the provider registry, never hardcoded in a handler. A provider that is not registered (unconfigured, e.g. missing credentials) behaves identically to an unknown one.

### `GET /api/v1/auth/login/:provider`

Redirects (`302`) the browser to the identity provider's authorization page, having generated `state`, a `nonce`, and a PKCE code verifier/challenge pair, and set a short-lived, signed, HttpOnly flow cookie (`moniqo_oidc_flow`) carrying them.

- Unknown/unconfigured provider → `302` redirect to `{APP_BASE_URL}/login?error=oauth_failed` (never a JSON `404` — this is a browser navigation, not an API call).

### `GET`, `POST` `/api/v1/auth/callback/:provider`

**This is the one endpoint in the entire API that never returns the `{success, data, msg}` JSON envelope.** It is reached via a top-level browser navigation from the identity provider, so every outcome — success or failure — is an HTTP redirect:

- **Success (login):** `302` to `{APP_BASE_URL}/oauth/callback#access_token=<jwt>`, with the refresh token set as the existing HttpOnly `moniqo_refresh` cookie. The access token is placed in the URL **fragment**, not a query parameter, so it is never sent to or logged by any server; the frontend reads it once and immediately calls `history.replaceState` to remove it from the visible URL.
- **Success (link):** `302` to `{APP_BASE_URL}/settings/connections?linked=<provider>`. No new tokens are issued — the user was already authenticated to reach the link flow.
- **Any failure** (invalid/expired state, failed code exchange, failed ID token verification, unverified email, identity conflict): `302` to `{APP_BASE_URL}/login?error=oauth_failed`. The specific cause is logged server-side and never exposed to the client.

Both `GET` (Google, Facebook) and `POST` (Apple, which uses `response_mode=form_post`) are handled by the same logic — the callback parameters (`code`, `state`) are read the same way regardless of HTTP method.

The flow cookie is read and cleared **unconditionally**, before any other processing — a callback can never be replayed with the same cookie value.

### `POST /api/v1/auth/link/:provider`

Requires an existing valid JWT. Begins the same PKCE/state flow as login, but the flow cookie also carries the authenticated user's ID, so the callback links the resulting identity to that specific account rather than logging in as a different user.

- Unknown provider → `404`.

### `DELETE /api/v1/auth/link/:provider`

Requires an existing valid JWT. Removes the link between the authenticated user and `:provider`.

- Success → `200`, `{"success": true, "data": null, "msg": "identity unlinked"}`.
- Removing a link that doesn't exist → `200` (idempotent, matching the rest of the API's `DELETE` conventions).
- Removing the user's **only** remaining sign-in method (no password set and no other linked identity) → `409 Conflict`, `msg: "cannot remove your only sign-in method"`. This blocks a state where the account becomes permanently inaccessible.

---

## Business Rules

### Account Linking Priority (Login)

When the callback completes a **login** flow, the resulting Moniqo user is resolved in this order:

1. **An existing linked identity** for `(provider, provider_subject)` — always wins, regardless of the account's current status.
2. **An existing account whose email matches** the provider's *verified* email — the identity is auto-linked to it. If that account was `pending_verification` (a dormant password signup that never confirmed its email), it is promoted to `active`: the identity provider's verification is itself sufficient proof of email ownership.
3. **Otherwise, a new account is created** — `active` immediately (not `pending_verification`, since the email is already provider-verified), with `hash = NULL` (no password).

**An unverified provider email is always rejected outright** (the callback fails generically) — there is no partial or pending path for OIDC signups, since Moniqo has no channel to verify an email the identity provider itself won't vouch for. This is a hard rule: `email_verified` must be `true` in the provider's ID token, checked before any account lookup.

### Account Linking (Explicit `POST /link/:provider`)

- If the identity is already linked to the *same* authenticated user, linking is a no-op success (idempotent).
- If the identity is already linked to a *different* user, the request fails — identities are never transferred between accounts.
- If the provider's verified email belongs to a *different* existing Moniqo account than the one making the request, the request fails — accounts are never silently merged just because their emails match.
- An unverified provider email is rejected here too.

### Uniqueness

- `(provider, provider_subject)` is unique at the database level — the same third-party account can never end up linked to two different Moniqo users, even under concurrent requests.
- The existing `email`/`username` uniqueness rules from `01-user-api.md` are unaffected; an OIDC-created account still gets a unique username (derived from the provider's name/email and, on collision, disambiguated with a numeric suffix) and a unique email.

---

## Security Constraints

- **Authorization Code Flow with PKCE** (S256) for all three providers.
- **State** is generated per flow, embedded in a signed cookie, and compared against the callback's `state` parameter — the standard OAuth2 CSRF mitigation (RFC 6749 §10.12). No separate CSRF token is layered on top, since a cross-site POST (Apple) would be incompatible with same-site CSRF middleware.
- **Nonce** is generated per flow and checked against the ID token's `nonce` claim to prevent replay of a previously issued token.
- **ID token verification** (performed for every provider before any claim is trusted): signature (via the provider's published JWKS), issuer, audience (Moniqo's client ID), and expiry. Only after this verification are `sub`/`email`/`email_verified`/`name`/`picture` trusted — an unauthenticated "userinfo" response is never used as a source of truth for identity.
- **Flow-state cookie**: HttpOnly, `SameSite=Lax` (required — a `Strict` cookie would be dropped on Apple's cross-site `form_post` callback), `Secure` in non-development environments, scoped to `/api/v1/auth`, 10-minute expiry enforced both by `Max-Age` and by an expiry timestamp embedded in the signed payload. It is cleared on every callback regardless of outcome.
- **Replay protection**: the flow cookie is single-use (cleared on first callback) and the identity provider's authorization `code` is itself single-use by IdP-side design — two independent layers.
- **HTTPS-only redirects**: all provider redirect URIs and the frontend callback target must be `https://` outside development.
- Never trust an email without `email_verified: true` from the provider's ID token.
