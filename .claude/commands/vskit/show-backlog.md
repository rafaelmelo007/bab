---
description: Aggregate all docs/features/*/TASKS.md and print filtered by status/owner/priority. Read-only.
argument-hint: [--status=...] [--owner=...] [--priority=...]
---

You are running `/vskit:show-backlog` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

**Filters:** `$ARGUMENTS`

1. Glob `docs/features/*/TASKS.md`.
2. Parse each row; apply filters from `$ARGUMENTS`.
3. Sort by priority desc, then feature.
4. Print: feature | task-id | priority | status | owner | summary.
5. Write nothing to disk.
