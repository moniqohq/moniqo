# Third-Party Authentication API

## Overview

Moniqo supports signing in with a third-party identity provider as an alternative and complement to password-based login. A user may link multiple providers to a single Moniqo account. There are two distinct integration models, depending on what each provider can offer on the web:

- **OpenID Connect (OIDC) redirect flow** — Google and Microsoft. The implementation is provider-agnostic (Strategy pattern): the auth service and HTTP handlers depend only on an `IdentityProvider` interface resolved from a `ProviderRegistry`, never on provider-specific logic. Adding a future redirect provider requires only a new provider package and one `Register()` call at startup — no handler, service, or router changes.
- **Facebook token flow** — Facebook has no web-compatible signed ID token. Its only such mechanism, Limited Login, is iOS-only; the web JS SDK's `FB.login()` yields only a classic opaque access token. Facebook therefore does not implement `IdentityProvider` and has no redirect endpoints. Instead, the browser obtains an access token via the Facebook JS SDK and POSTs it to a dedicated endpoint, which verifies it server-side against Facebook's Graph API. See [Facebook Token Flow](#facebook-token-flow) below.

**Base URL:** `/api/v1/auth`

> This document, together with `01-user-api.md`, is the source of truth for the User/Auth domain's third-party login contract. It complements — and does not replace — the existing password-based `/api/v1/auth/login`, `/refresh`, `/logout`, and `/password-reset*` endpoints.

---

## Domain Model — UserIdentity

A linked third-party identity, one row per (provider, Moniqo user) pair. A user may have several — one per provider they've linked. This table is shared by both integration models above; a `provider='facebook'` row looks identical to a `provider='google'` row.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Auto-generated serial numeric ID |
| `user_id` | Integer | Yes | The Moniqo user this identity is linked to |
| `provider` | String | Yes | `google`, `microsoft`, or `facebook` |
| `provider_subject` | String | Yes | The provider's stable, unique subject identifier (OIDC `sub` claim, or Facebook's Graph `id`) |
| `provider_email` | String | No | The email the provider asserted at link time (informational only) |
| `created_at` | Timestamp | Yes | When the identity was linked |
| `updated_at` | Timestamp | Yes | Last modification timestamp |

Unique constraint: `(provider, provider_subject)` — the same provider account can never be linked to two different Moniqo users.

Moniqo never persists OAuth/Graph API access or refresh tokens from the identity provider — only the local Moniqo JWT/refresh token pair is issued and stored, exactly as for password login.

Related change to the `users` table: `hash` is nullable. An account created purely via a third-party identity (no password ever set) has `hash = NULL`; see `01-user-api.md`'s Domain Model for the updated field table.

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/auth/login/:provider` | None | **Redirect flow only.** Begins the login flow: redirects to the provider |
| `GET`, `POST` | `/api/v1/auth/callback/:provider` | None | **Redirect flow only.** The provider's redirect back to Moniqo — see note below |
| `POST` | `/api/v1/auth/facebook/login` | None | **Facebook only.** Verifies a client-obtained access token and logs in/signs up |
| `POST` | `/api/v1/auth/facebook/link` | Required | **Facebook only.** Verifies a client-obtained access token and links it |
| `GET` | `/api/v1/auth/identities` | Required | Lists the providers linked to the authenticated account (both models) |
| `POST` | `/api/v1/auth/link/:provider` | Required | **Redirect flow only.** Begins linking `:provider` to the authenticated account |
| `DELETE` | `/api/v1/auth/link/:provider` | Required | Unlinks `:provider` from the authenticated account (both models, including `facebook`) |

`:provider` in the redirect endpoints is `google` or `microsoft`, resolved dynamically from the provider registry, never hardcoded in a handler. `facebook` is never in that registry — it is recognized separately for `DELETE /link/:provider` eligibility (so a linked Facebook identity can always be unlinked even though it was never linked via `POST /link/:provider`). A provider that is not registered/recognized (unconfigured, e.g. missing credentials) behaves identically to an unknown one.

### `GET /api/v1/auth/login/:provider`

Redirects (`302`) the browser to the identity provider's authorization page, having generated `state`, a `nonce`, and a PKCE code verifier/challenge pair, and set a short-lived, signed, HttpOnly flow cookie (`moniqo_oidc_flow`) carrying them.

- Unknown/unconfigured provider → `302` redirect to `{APP_BASE_URL}/login?error=oauth_failed` (never a JSON `404` — this is a browser navigation, not an API call).

### `GET`, `POST` `/api/v1/auth/callback/:provider`

**This is the one endpoint in the entire API that never returns the `{success, data, msg}` JSON envelope.** It is reached via a top-level browser navigation from the identity provider, so every outcome — success or failure — is an HTTP redirect:

- **Success (login):** `302` to `{APP_BASE_URL}/oauth/callback#access_token=<jwt>`, with the refresh token set as the existing HttpOnly `moniqo_refresh` cookie. The access token is placed in the URL **fragment**, not a query parameter, so it is never sent to or logged by any server; the frontend reads it once and immediately calls `history.replaceState` to remove it from the visible URL.
- **Success (link):** `302` to `{APP_BASE_URL}/settings/connections?linked=<provider>`. No new tokens are issued — the user was already authenticated to reach the link flow.
- **Any failure** (invalid/expired state, failed code exchange, failed ID token verification, unverified email, identity conflict): `302` to `{APP_BASE_URL}/login?error=oauth_failed`. The specific cause is logged server-side and never exposed to the client.

Both Google and Microsoft use `GET` here; the same handler also accepts `POST` for any future provider using `response_mode=form_post`.

The flow cookie is read and cleared **unconditionally**, before any other processing — a callback can never be replayed with the same cookie value.

### `GET /api/v1/auth/identities`

Requires an existing valid JWT. Returns the providers linked to the authenticated account.

- Response: `200`, `{"success": true, "data": [{"provider": "google", "linked_at": "2026-01-15T10:00:00Z"}], "msg": "identities retrieved"}`. `data` is `[]` (never `404`) when nothing is linked.
- Deliberately omits `provider_subject` and `provider_email` — the frontend only needs to know *which* providers are linked to render a Link/Unlink control per provider.

### `POST /api/v1/auth/link/:provider`

Requires an existing valid JWT. Begins the same PKCE/state flow as login, but the flow cookie also carries the authenticated user's ID, so the callback links the resulting identity to that specific account rather than logging in as a different user.

- Unknown provider → `404`.
- Facebook is not reachable through this endpoint — use `POST /api/v1/auth/facebook/link`.

### `DELETE /api/v1/auth/link/:provider`

Requires an existing valid JWT. Removes the link between the authenticated user and `:provider`.

- Success → `200`, `{"success": true, "data": null, "msg": "identity unlinked"}`.
- Removing a link that doesn't exist → `200` (idempotent, matching the rest of the API's `DELETE` conventions).
- Removing the user's **only** remaining sign-in method (no password set and no other linked identity) → `409 Conflict`, `msg: "cannot remove your only sign-in method"`. This blocks a state where the account becomes permanently inaccessible.

---

## Facebook Token Flow

Facebook cannot use the redirect flow above for two independent reasons: it has no web-compatible signed ID token (see Overview), and the org's Facebook App cannot register an OAuth `redirect_uri` or obtain Advanced Access. Instead:

1. The browser loads the Facebook JS SDK and calls `FB.login()`, obtaining a user access token client-side. This requires no registered redirect URI — only Facebook's "App Domains" / Website platform settings.
2. The browser POSTs that access token to Moniqo.
3. Moniqo verifies it server-side via Facebook's Graph API before trusting anything about it.

### `POST /api/v1/auth/facebook/login`

No auth required. Body: `{"access_token": "<facebook access token>", "intent": "login" | "signup"}` (`intent` defaults to `"login"` if omitted or unrecognized — matching `?intent=signup` on the redirect flow's login endpoint, this never creates an account unless the request explicitly opts into signup).

- Success → `200`, same session shape as password login: `{"success": true, "data": {"access_token": "<jwt>", "token_type": "Bearer"}, "msg": "login successful"}`, refresh token set as the `moniqo_refresh` HttpOnly cookie.
- Login intent with no matching account → `401`, no account created.
- Facebook did not report a confirmed email (see verification below) → `400`.
- Token failed Graph API verification → `400`.
- Rate-limited per IP, same policy as `/api/v1/auth/login`.

### `POST /api/v1/auth/facebook/link`

Requires an existing valid JWT. Body: `{"access_token": "<facebook access token>"}`.

- Success → `200`, `{"success": true, "data": null, "msg": "identity linked"}`.
- Same conflict rules as the redirect flow's link behavior (never transfers an identity linked to another user, never merges into a different account by email).
- Rate-limited per IP — this endpoint drives an outbound Graph API call per request and is an account-enumeration oracle via its email-conflict response, so it is metered like a public auth endpoint even though it requires a JWT.

### Verification

Moniqo verifies a Facebook access token via two Graph API calls before trusting it:

1. `GET /debug_token?input_token=<token>&access_token=<app_id>|<app_secret>` — asserts the token is valid, is of type `USER` (not an app or Page token), and critically **was issued for Moniqo's own Facebook App** (`app_id` matches). Skipping this check would let a token minted for a different, attacker-controlled Facebook app be replayed to Moniqo.
2. `GET /me?fields=id,name,email,picture`, with the user token sent as an `Authorization: Bearer` header (never a query parameter, so it never reaches a URL or access log) — fetches the profile the token authorizes. Its `id` is cross-checked against `debug_token`'s `user_id`.

**Email verification signal is weaker than the redirect flow's.** Google and Microsoft assert `email_verified` in a cryptographically signed ID token. Facebook's Graph API has no equivalent claim; instead, Meta's documented behavior is that `/me` omits the `email` field entirely unless the address is confirmed. Moniqo therefore treats `EmailVerified := (email present)` — policy-based trust in Meta's platform behavior, not a signature Moniqo itself checked. This is a deliberate, accepted trade-off, not an oversight.

Once verified, the resulting identity is subject to the exact same [Account Linking Priority](#account-linking-priority-login) and [Account Linking](#account-linking-explicit-postlinkprovider) rules as the redirect flow — there is no separate policy for Facebook past the verification step.

---

## Business Rules

### Account Linking Priority (Login)

When a login flow completes — the redirect callback or `POST /api/v1/auth/facebook/login` — the resulting Moniqo user is resolved in this order:

1. **An existing linked identity** for `(provider, provider_subject)` — always wins, regardless of the account's current status.
2. **An existing account whose email matches** the provider's *verified* email — the identity is auto-linked to it. If that account was `pending_verification` (a dormant password signup that never confirmed its email), it is promoted to `active`: the identity provider's verification is itself sufficient proof of email ownership.
3. **Otherwise, a new account is created** — `active` immediately (not `pending_verification`, since the email is already provider-verified), with `hash = NULL` (no password). Only when the flow's intent is `signup`; login intent instead fails with "no account found" and never creates one.

**An unverified provider email is always rejected outright** (the callback/endpoint fails generically) — there is no partial or pending path for third-party signups, since Moniqo has no channel to verify an email the identity provider itself won't vouch for. This is a hard rule, checked before any account lookup.

### Account Linking (Explicit Link)

- If the identity is already linked to the *same* authenticated user, linking is a no-op success (idempotent).
- If the identity is already linked to a *different* user, the request fails — identities are never transferred between accounts.
- If the provider's verified email belongs to a *different* existing Moniqo account than the one making the request, the request fails — accounts are never silently merged just because their emails match.
- An unverified provider email is rejected here too.

### Uniqueness

- `(provider, provider_subject)` is unique at the database level — the same third-party account can never end up linked to two different Moniqo users, even under concurrent requests.
- The existing `email`/`username` uniqueness rules from `01-user-api.md` are unaffected; an identity-created account still gets a unique username (derived from the provider's name/email and, on collision, disambiguated with a numeric suffix) and a unique email.

---

## Security Constraints

### Redirect flow (Google, Microsoft)

- **Authorization Code Flow with PKCE** (S256).
- **State** is generated per flow, embedded in a signed cookie, and compared against the callback's `state` parameter — the standard OAuth2 CSRF mitigation (RFC 6749 §10.12).
- **Nonce** is generated per flow and checked against the ID token's `nonce` claim to prevent replay of a previously issued token.
- **ID token verification** (performed before any claim is trusted): signature (via the provider's published JWKS), issuer, audience (Moniqo's client ID), and expiry. Only after this verification are `sub`/`email`/`email_verified`/`name`/`picture` trusted — an unauthenticated "userinfo" response is never used as a source of truth for identity.
- **Flow-state cookie**: HttpOnly, `SameSite=Lax`, `Secure` in non-development environments, scoped to `/api/v1/auth`, 10-minute expiry enforced both by `Max-Age` and by an expiry timestamp embedded in the signed payload. It is cleared on every callback regardless of outcome.
- **Replay protection**: the flow cookie is single-use (cleared on first callback) and the identity provider's authorization `code` is itself single-use by IdP-side design.
- **HTTPS-only redirects**: all provider redirect URIs and the frontend callback target must be `https://` outside development.

### Facebook token flow

Has no redirect, so PKCE/state/nonce/flow-cookie do not apply — the access token itself, verified server-side, is the entire trust boundary:

- The `debug_token` `app_id` check (see [Verification](#verification)) is the flow's equivalent of PKCE/state — without it, a token issued by a different Facebook app could be replayed to Moniqo.
- The token is a Meta-issued bearer credential with no audience binding to a specific Moniqo request; a browser-side leak (XSS, malicious extension) is usable until the token's own (Meta-controlled) expiry. Moniqo never persists or logs it, and never echoes it back in any response.
- Never trust an email without either `email_verified: true` (OIDC providers) or a present `email` field (Facebook, per Meta's documented confirmed-address-only behavior).
