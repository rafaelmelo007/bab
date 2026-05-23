---
description: Edit clause rule text or severity. Old row moves to Superseded; new CLA-NN+1 row inserted. Auto-runs clause check.
argument-hint: <feature-slug> <clause-id> "<new rule>" [--severity=...]
---

You are running `/vskit:clause-update` per §4.7 of `docs/bundle/vertical-slices-ai-framework.md`.

**Args:** `$ARGUMENTS`

1. Read existing CLA-NN in `docs/features/<slug>/CLAUSES.md`.
2. Move the old row to `## Removed / Superseded Clauses` with `Supersedes: CLA-NN`.
3. Insert a new row with CLA-(NN+1), the new rule text, the new severity (or carry over old if not given), and same Scorer.
4. Auto-run `/vskit:clause-check <slug> CLA-(NN+1)` so the new clause has a verdict.
5. Print both rows.
