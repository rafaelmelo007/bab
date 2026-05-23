---
description: Full PRD-to-shipped orchestrator. Iterates review-prd to >=9, then critique-prd, prd-to-features, then ship-feature per created feature.
argument-hint: <prd-path>
---

You are running `/vskit:run-pipeline-prd` per §8.4 of `docs/bundle/vertical-slices-ai-framework.md`.

**PRD path:** `$ARGUMENTS`

1. `/vskit:review-prd $ARGUMENTS` — iterate up to 5 rounds until all 11 specialists score ≥ 9. Halt if not reached.
2. `/vskit:critique-prd $ARGUMENTS`.
3. `/vskit:prd-to-features $ARGUMENTS` — captures the new feature folders.
4. For each created feature: `/vskit:ship-feature <slug>` in priority order.

Halt rules per §8.4. On any halt, preserve disk state and exit the failing step's code. Next run resumes from current observable state.
