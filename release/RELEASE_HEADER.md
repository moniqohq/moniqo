# Moniqo just got better.

We're excited to announce the release of **Moniqo v0.1.0**.

This release includes **new features, usability improvements, performance enhancements, and bug fixes** that make budgeting smoother, faster, and more reliable.

---

## ✨ Highlights

This release introduces several improvements across the application. Here are the biggest changes.

### 🚀 Envelope Budgeting and the Transaction Engine

Moniqo's core budgeting loop is now fully in place: zero-based, cash-backed envelope budgeting paired with a real transaction engine. You can allocate "To Be Budgeted" cash into envelopes, log transactions against accounts, and watch envelope balances and account balances stay in sync automatically.

This matters because it's the heart of the app — everything else (accounts, reconciliation, search) exists to support this loop. Keeping allocation and spending as distinct operations, rather than collapsing them into a single balance update, is what lets Moniqo enforce cash-backed budgeting instead of just tracking numbers.

With this release, transactions support pagination, running balances, and a detail popup for quick edits, and account reconciliation now flows through the same real API instead of client-side approximations — so what you see on screen matches what's actually stored.

> Thanks to everyone who helped shape this feature through discussions, issues, and contributions.

### 🔍 Global Search and Cross-Module Navigation

A new global search lets you jump straight to accounts, envelopes, and transactions from anywhere in the app, instead of hunting through each module separately. Related fixes across modules ensure that reloading a page, switching between envelopes and transactions, or looking up your username and dashboard data all stay consistent.

Faster navigation matters most in the workflows people repeat daily — checking a balance, finding a specific transaction, jumping into an envelope. Community feedback on friction points while moving between modules directly shaped this work.

> Thanks to everyone who helped shape this feature through discussions, issues, and contributions.

### 🔐 Email Verification and Secure Session Handling

Authentication now includes email verification with a cookie-based refresh token flow, replacing the earlier bare JWT-only setup. This tightens account security without adding friction to everyday logins.

Since a budget is only as trustworthy as the account guarding it, hardening the auth layer before wider release was a priority raised through early testing and security review.

> Thanks to everyone who helped shape this feature through discussions, issues, and contributions.

---

## ▶️ Running Moniqo

Extract the release archive for your operating system. From the extracted directory, start Moniqo by running:

```bash
./scripts/start.sh
```

This starts both the backend (`bin/moniqo`) and the web server (`web/`).
Drop any deployment-specific configuration (e.g. a `.env` file) into
`config/` first — see `config/README.md`. Stop both processes with
`./scripts/stop.sh`.
