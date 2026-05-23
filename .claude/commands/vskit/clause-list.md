---
description: Print all active clauses for a feature, optionally filtered by status. Read-only.
argument-hint: <feature-slug> [--status=pass|fail|stale|indeterminate]
---

You are running `/vskit:clause-list` per §4.7 of `docs/bundle/vertical-slices-ai-framework.md`.

**Args:** `$ARGUMENTS`

1. Read `docs/features/<slug>/CLAUSES.md`.
2. Filter the active table by `--status` if given. "Stale" = last code-check older than 14 days.
3. Print: CLA-ID | severity | rule (truncated) | last verdict | confidence | last-check age.
4. Write nothing to disk.
