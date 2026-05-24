---
description: 11 parallel subagents score and critique the PRD independently. Iterate until the §3.4 promotion gate passes. On PASS, automatically git mv from prds/draft/ to prds/ (staged, uncommitted).
argument-hint: <prd-path>
---

You are running `/vskit:review-prd` per §3.1 + §3.3 + §3.4 + §3.5 of `docs/bundle/vertical-slices-ai-framework.md`.

**PRD path:** `$ARGUMENTS`

If `$ARGUMENTS` is empty, look in `docs/prds/draft/` for the single PRD file and use it. If there is more than one draft PRD, ask the user which one.

### Steps

1. Read the PRD at the given path.
2. Invoke the 11 specialists from §2.1 in parallel via the Agent tool, each scoring 0–10 against their lens per the §3.3 rubric.
3. Append a row per specialist to `## Round-Table Scores` and one row to `## Score History` per INV-1 dedup (consecutive identical rows collapse to a date range).
4. **Evaluate the §3.4 promotion gate.** It PASSES iff *all three* hold:
   a. The latest round populated every specialist row in `## Round-Table Scores`.
   b. For each specialist, either the latest score is ≥ 9, **or** there is a matching row in the PRD's `## Permanent Waivers` section recorded *before or during* the most recent round.
   c. No specialist's latest score is < 7 (sub-7 cannot be waived — revise instead).

5. **If the gate FAILS:** surface the failing specialists' concrete concerns. If rounds remaining < 5, attempt targeted revision and re-run step 2. If the only remaining failures are structurally unmeetable (no real user research, no vendor ToS reads, no license decisions you can make), pause and ask the operator whether to record a §3.5 waiver (one per affected specialist) and continue, or stop here. Do not invent waivers without operator confirmation.

6. **If the gate PASSES:** perform the promotion *yourself* — do not tell the user to run `git mv` manually. INV-2 forbids manual re-execution of a decision the gate has already made.
   - Compute target path: `docs/prds/<basename of input>` (strip the `draft/` directory).
   - Run `git mv <input-path> <target-path>`. The move is staged but **not committed**; the operator owns commit timing.
   - Update the PRD frontmatter: replace any `Status:` line with `Status: Promoted` and add (or refresh) `Promoted: <YYYY-MM-DD>`.
   - If the frontmatter contains `Primary: true`, additionally write the promoted PRD's full content to `docs/PRD.md` (overwriting). Default behavior: do not touch `docs/PRD.md`.
   - Print a one-line summary: `Promoted: <target-path> (gate: <N>/11 scored ≥9, <M> waivers). Move is staged; commit when ready.`
   - Suggest the next command: `/vskit:prd-to-features <target-path>`.

### Recording waivers

When you and the operator agree to a §3.5 waiver, append (or create) a `## Permanent Waivers` section at the bottom of the PRD with this exact shape:

```markdown
## Permanent Waivers

### W-NN — <specialist-slug> — <YYYY-MM-DD> — capped at <score>

**Reason:** <one paragraph naming the §3.3 lens criterion that is structurally unmeetable and why>
**Falsification path:** <observable signal that would invalidate the waiver — e.g., a §10 adoption metric, a vendor response, future user research — with the action that follows>
**Operator decision:** <who approved and when (one line)>
```

A waiver added after a failed round counts only for the *next* round's gate evaluation, not the one that triggered it (prevents whitewashing).
