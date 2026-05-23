---
description: Specialists interrogate the PRD for weak evidence, missing sections, vague metrics. Updates Open Questions.
argument-hint: <prd-path>
---

You are running `/vskit:critique-prd` (renamed from `/grill-me prd` in v1.6) per §3.1 + §8.1 of `docs/bundle/vertical-slices-ai-framework.md`.

**PRD path:** `$ARGUMENTS`

1. Read the PRD.
2. Invoke the 11 specialists from §2.1 in parallel via Agent. Each interrogates the PRD for weak evidence, missing required sections (§3.2 template), and vague success metrics.
3. Annotate the PRD with inline questions where evidence is thin.
4. Append unresolved items to PRD `## §13 Open Questions` with owner + due date placeholders.
5. Per INV-3, never silently drop a finding — questions become open-question rows.
