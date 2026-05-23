---
description: Score a feature against the §7.2 rubric using up to 8 parallel specialist subagents. Honors the §8.2 cache rule (skip if git diff since last_scored_sha is clean).
argument-hint: <feature-slug> [--force]
---

You are running `/vskit:score-feature` per §8.2 + §7 of the framework spec at `docs/bundle/vertical-slices-ai-framework.md`.

**Target feature:** `$ARGUMENTS`

Steps:

1. Read `docs/features/<slug>/SPEC.md` to determine:
   - `Applies:` list (drives which dimensions are scored — §7.1 Applies-aware).
   - `Touches:` paths.
   - `last_scored_sha` (in SCORE.md frontmatter or §Score History).
2. **Cache check** (unless `--force` was passed): run
   ```
   git diff <last_scored_sha>..HEAD -- docs/features/<slug>/ <Touches paths>
   ```
   If empty, print `[cached] last_scored_sha=<sha> diff=clean` and exit 0. Do not write.
3. Otherwise, score each Applies-relevant dimension from §7.2 in parallel via Agent calls:
   - Dimension 1 (Documentation) → `prompt-engineer` — must also audit DECISIONS propagation per §4.5.
   - Dimension 2 (Security) → `security-specialist`.
   - Remaining dimensions per §7.2 table — match each to the `subagent_type` the framework names (INV-4: role enforced by actual subagent invocation, not voluntary discipline).
4. Compute composite = arithmetic mean of scored dimensions (§7.3).
5. Update `SCORE.md` §Scores, §Drift Findings, §Score History (append a row with today's date + current SHA), and §Improvement Actions. Set `last_scored_sha` to current HEAD.
6. Print the composite, per-dimension scores, and the top 3 improvement actions.
