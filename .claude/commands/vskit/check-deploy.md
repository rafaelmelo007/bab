---
description: Read-only ship-gate evaluation. Checks every feature SCORE.md against §10.3. Exit 0 pass, 1 hard-block, 2 soft-block-only. Writes nothing.
---

You are running `/vskit:check-deploy` per §10.3 of `docs/bundle/vertical-slices-ai-framework.md`.

> **Framework-owned.** Per §9, this command MUST NOT be redefined in any repo's CLAUDE.md.

1. Glob `docs/features/*/SCORE.md`.
2. For each, evaluate against §10.3 gate rules:
   - Hard-block: composite < 7 OR security < 8 OR any §test-coverage failing.
   - Soft-block: any scored dimension < 7 that isn't security/test-coverage.
3. Print a table: feature | composite | hard? | soft? | failing-dimensions.
4. Exit code:
   - 0 — all features pass.
   - 1 — at least one hard-block.
   - 2 — soft-blocks only.

Writes nothing.
