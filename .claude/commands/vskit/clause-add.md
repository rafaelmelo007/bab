---
description: Append a new CLA-NN row to docs/features/<slug>/CLAUSES.md. Creates the file and adds 'clauses' to Applies if missing. Runs clause check on the new row.
argument-hint: <feature-slug> "<rule>" [--severity=low|medium|high|critical]
---

You are running `/vskit:clause-add` per §4.7 + §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

**Args:** `$ARGUMENTS`

1. Parse `<feature-slug>`, `"<rule>"`, optional `--severity` (default Medium).
2. If `docs/features/<slug>/CLAUSES.md` does not exist, copy from `docs/bundle/templates/CLAUSES.md` and add `clauses` to SPEC `Applies:`.
3. Append a new row with auto-incremented CLA-NN, the rule text, severity, default Scorer = `security-specialist`.
4. Auto-run `/vskit:clause-check <slug> CLA-NN` so a baseline verdict is recorded immediately.
5. Print the new row.
