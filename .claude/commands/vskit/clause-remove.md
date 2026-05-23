---
description: Move a clause from the active table to Removed/Superseded with reason and final verdict. Confirmation required. Silent deletion forbidden.
argument-hint: <feature-slug> <clause-id>
---

You are running `/vskit:clause-remove` per §4.7 of `docs/bundle/vertical-slices-ai-framework.md`.

**Args:** `$ARGUMENTS`

1. Read `docs/features/<slug>/CLAUSES.md` and locate the named CLA-NN.
2. Ask the user for the removal reason. **Do not skip this prompt** — §4.7 forbids silent deletion.
3. Run `/vskit:clause-check <slug> <clause-id>` one last time to capture a final verdict.
4. Move the row from the active table to `## Removed / Superseded Clauses` with: reason, final verdict, date.
5. Print confirmation.
