---
description: Read-only scan of all CLAUSES.md. Reports stale, failing, and INDETERMINATE clauses sorted by severity then staleness.
---

You are running `/vskit:clause-audit` per §4.7 + §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/features/*/CLAUSES.md`.
2. For each active row, compute staleness: days since last code-check.
3. Report:
   - All FAIL @ conf ≥ 80% (sorted by severity desc).
   - All INDETERMINATE (sorted by severity desc).
   - All Stale (> 14 days) — sorted by severity desc, then age desc.
4. Exit non-zero if any High/Critical FAIL or any stale High/Critical.
5. Writes nothing.
