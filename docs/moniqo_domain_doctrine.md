# Moniqo — Domain Doctrine

> This document defines the foundational architectural philosophy for our budgeting system. It establishes non-negotiable domain boundaries, invariants, and modeling decisions that ensure mathematical correctness, conceptual clarity, and long-term maintainability.
>
> It is not an implementation guide — it is a domain doctrine.

---

## Core Philosophy

Moniqo is based on:

- **Zero-based budgeting**
- **Cash-based accounting**
- **Envelope method**
- **Single source of truth** = transactions
- **Allocation is separate from spending**

That means:

- Money exists in **accounts**
- Budget exists in **categories** (envelopes)
- Allocation moves money from `To Be Budgeted` → categories
- Spending reduces category balances

---

## Budget as a Financial Universe

A **Budget** represents a closed financial system.

Within a budget:

- All on-budget accounts form a single cash pool.
- All allocations (envelopes/categories) must be backed by real cash.
- All liabilities must be internally reconciled.
- No external financial state may influence internal invariants.

> **One Budget = One Financial Universe**

---

## Budget Isolation Boundary

Budgets are **strictly isolated** from one another.

There is:

- No shared accounts across budgets
- No cross-budget transfers
- No shared cash pools
- No shared liability reconciliation
- No cross-budget allocation awareness

Each budget is an **independent aggregate**.

```
User
 ├── Budget A
 │     ├── Accounts
 │     ├── Categories
 │     └── Transactions
 │
 └── Budget B
       ├── Accounts
       ├── Categories
       └── Transactions
```

> Isolation is intentional and enforced at the data model level.

---

## Budget Owns Accounts

Accounts are **children of a Budget**.

Constraints:

- `Account.BudgetID` is required.
- Accounts cannot move between budgets.
- Deleting a budget deletes all its accounts.
- Transactions must reference accounts within the same budget.

This enforces **aggregate integrity**. An account inside a budget represents that budget's version of financial truth.

If the same real-world bank account is added to two budgets:

- They are treated as two **independent representations**.
- The system does **not** attempt global reconciliation.

---

## Multiple Budgets Philosophy

Users may create multiple budgets simultaneously.

Each must represent one of the following:

- A separate real-world financial pool (e.g., personal vs. business accounts)
- A logical partition of funds (user manually divides one real account across budgets)
- An independent planning simulation

Budgets are **not**:

- Historical snapshots
- Version histories
- Time-based states
- Shared financial overlays

They are **parallel financial universes**.

---

## Why We Reject Shared Accounts Across Budgets

Allowing a single account to exist in multiple budgets would require:

- Global ledger abstraction
- Cross-budget allocation locking
- Double-spend prevention across budgets
- Distributed reconciliation logic

This dramatically increases complexity and introduces:

- Allocation race conditions
- Over-commitment of funds
- Invariant ambiguity

We **intentionally avoid** this design.

---

## When to Create Multiple Budgets

Users should create multiple budgets only when:

- Managing separate legal entities
- Managing fully separate bank accounts
- Running independent financial simulations
- Intentionally partitioning capital

---

## Design Non-Negotiables

The following are **architectural commitments**:

| # | Invariant |
|---|-----------|
| 1 | Accounts must belong to exactly one budget. |
| 2 | Budgets must be fully isolated. |
| 3 | Cross-budget transfers are disallowed. |
| 4 | Allocation must always be cash-backed. |
| 5 | Budget deletion cascades to all children. |
| 6 | Credit card liabilities must auto-reconcile to payment categories. |

---

*Moniqo Domain Doctrine — foundational and non-negotiable.*
