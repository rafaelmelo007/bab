---
description: 11 parallel subagents score and critique the PRD independently. Iterate until all scores >= 9. Appends one row per round to PRD Score History.
argument-hint: <prd-path>
---

You are running `/vskit:review-prd` per §3.1 + §3.3 of `docs/bundle/vertical-slices-ai-framework.md`.

**PRD path:** `$ARGUMENTS`

1. Read the PRD at the given path.
2. Invoke the 11 specialists from §2.1 in parallel via the Agent tool, each scoring 0–10 against their lens per the §3.3 rubric.
3. Append a row to `## Round-Table Scores` and `## Score History` per INV-1 dedup (consecutive identical rows collapse to a date range).
4. If any specialist scored < 9, surface their concrete findings and iterate. Max 5 rounds.
5. When all ≥ 9, print "PRD ready for promotion" and (manually) `git mv` from `docs/prds/draft/` to `docs/prds/`.
