---
title: "Moniqo v0.4.0 – What's New?"
date: 2026-04-20
author: "Moniqo Team"
description: "New features, improvements, and fixes to make your budgeting experience even better."
categories: ["Product Updates"]
tags: ["release notes", "v0.4.0", "new features", "product"]
featured_image: "/images/blog/moniqo-v040.svg"
---

Moniqo v0.4.0 is here. This release focused on three things: speed, clarity, and a handful of features you've been asking for.

## What's new

### Improved transaction import

CSV import now supports more bank formats out of the box. We've also added a mapping step so you can configure which column maps to which field — no more failed imports due to column order differences.

### Spending velocity indicator

Each envelope now shows a visual indicator of how quickly you're spending relative to how far through the month you are. A green indicator means you're on track; amber means you're spending a bit fast; red means you'll likely overspend if the pace continues.

## Fixes

- Fixed a race condition that could cause duplicate transactions on rapid saves
- Corrected date parsing for DD/MM/YYYY formats on import
- Resolved an edge case where moving money between envelopes could briefly show a negative "To Be Budgeted" balance

## What's next

v0.5.0 will introduce recurring transactions, goal tracking improvements, and the first version of the mobile companion app. Follow along on GitHub.
