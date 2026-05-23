---
description: Re-evaluate one (or all) active clauses against the current SPEC and code. Updates last-spec-check and last-code-check rows. Exit non-zero on High/Critical FAIL at confidence >= 80%.
argument-hint: <feature-slug> [<clause-id>]
---

You are running `/vskit:clause-check` per §4.7 of `docs/bundle/vertical-slices-ai-framework.md`.

**Args:** `$ARGUMENTS`

1. Read CLAUSES.md. If `<clause-id>` given, scope to that row; else iterate all active rows.
2. For each clause: invoke the row's `Scorer:` subagent (default `security-specialist`) via Agent. The scorer evaluates the rule against:
   - Current SPEC + DECISIONS (spec-check)
   - Current code in SPEC `Touches:` paths (code-check)
   Returns verdict (PASS / FAIL / INDETERMINATE), confidence (0–100%), top 5 most-relevant files, brief reasoning.
3. Update the row's last-spec-check / last-code-check sub-rows with verdict + confidence + date + reasoning.
4. Exit code: 0 if no High/Critical FAIL @ conf ≥ 80%; 1 otherwise.
