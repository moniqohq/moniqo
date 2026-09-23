# Data Retention & Deletion

This document describes what actually happens to data when a user deletes
their account, and what it does not cover. It makes no legal claims (GDPR,
CCPA, or otherwise) — Moniqo has no published privacy policy or data
processing agreement today; this is an engineering description of current
behavior, not a compliance statement.

## What account deletion does

`DELETE /api/v1/users/{id}` (see `docs/apis/01-user-api.md`) is a self-service,
immediate soft delete with no grace period:

- The user row is marked `deleted_at` and becomes unreachable through the API.
- All refresh tokens are revoked and the caller's current access token is
  blocklisted — no session or token survives deletion.
- Pending password-reset tokens are invalidated.
- Linked OIDC identities (Google/Apple/Facebook) are removed.
- Budgets the user solely owns (no other active members) are soft-deleted
  along with their memberships — mirroring ordinary budget deletion. Their
  accounts, envelopes, and transactions are left in place, matching the
  domain doctrine's audit-preservation rule; they simply become unreachable
  once the containing budget is gone.
- The user's memberships in budgets they don't solely own are soft-deleted.
  Those budgets, their data, and other members are unaffected.
- If the user is the sole `OWNER` of a budget that still has other active
  members, deletion is blocked (`409`) until ownership is transferred or the
  other members are removed. Deletion never implicitly destroys a
  collaborator's data.

Deletion removes the account and this data from the **live application
database** immediately. It does not touch historical transactions belonging
to budgets that survive, and it does not reach into database backups.

## What account deletion does not do

- **Backups.** Deleted user and budget data may continue to exist in
  database backups until those backups age out under the normal backup
  retention schedule. This project does not currently have a documented
  backup retention policy — **TODO:** define and publish one (retention
  window, backup encryption, and restore procedure).
- **Backup restores.** A restored backup must not silently reintroduce a
  user or budget that was already deleted at the time of the restore. No
  automated safeguard for this exists yet — **TODO:** decide whether restore
  tooling should re-apply `deleted_at` state from a point-in-time snapshot,
  or otherwise reconcile restored data against current deletion state.
- **Hard deletion / erasure.** Nothing is physically removed from the primary
  database other than OIDC identity links. Usernames and emails are
  permanently reserved by a full-table unique index (including soft-deleted
  rows) and are never released for re-registration.
- **Legally mandated retention exceptions.** None are currently implemented
  or required by any published policy. If a future legal or regulatory
  requirement demands longer retention of specific records, that exception
  must be designed and documented separately — this document does not
  presuppose one.

## Frontend behavior

The account-deletion UI (Settings → Data & Privacy → Delete Account) must not
claim that backups are destroyed immediately or that deletion satisfies any
specific legal erasure standard — see the "What account deletion does not do"
section above.
