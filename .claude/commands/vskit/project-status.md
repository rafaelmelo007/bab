---
description: Read all SPEC.md files; print feature states, priorities, composite scores, and blockers. Read-only.
---

You are running `/vskit:project-status` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/features/*/SPEC.md`.
2. For each feature, compute its lifecycle state per §4.1 from observable file state (NEVER from a declared field — except `Deprecated`).
3. Read SCORE.md composite and any `DEF-NN` blockers from DECISIONS.md.
4. Print a table: slug | state | priority (from SPEC frontmatter) | composite | open DEFs | last activity.
5. Write nothing to disk.
