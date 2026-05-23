---
description: Run /vskit:clause-check across every feature with 'clauses' in Applies. Aggregated exit code.
argument-hint: [--feature=<slug>]
---

You are running `/vskit:clause-check-all` per §4.7 + §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

**Args:** `$ARGUMENTS`

1. Glob `docs/features/*/SPEC.md`; filter to those whose `Applies:` includes `clauses`. Optionally narrow via `--feature=<slug>`.
2. For each, invoke `/vskit:clause-check <slug>` (no clause-id → checks all active clauses).
3. Aggregate exit codes: 1 if any feature reports High/Critical FAIL @ conf ≥ 80%; else 0.
4. Print a summary table: feature | active clauses | PASS | FAIL | INDETERMINATE.
