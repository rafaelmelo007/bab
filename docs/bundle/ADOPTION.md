# Adopting vertical-slices-md-dev-kit — under-an-hour tutorial

This is the narrative version of the spec's §11 checklist. Follow it once, end-to-end, and your repo runs on **vertical-slices-md-dev-kit** — quality gates for AI-assisted code.

**Time budget:** 45–60 minutes for a fresh repo. Add ~30 minutes for an existing repo with legacy `docs/`.

## Where a feature lives in its lifecycle

Lifecycle states are computed from observable file state (spec §4.1), never declared. Knowing what state a feature is in tells you exactly which command is next:

```mermaid
stateDiagram-v2
    [*] --> Backlog: feature folder created
    Backlog --> SpecInProgress: SPEC §3 ACs drafted
    SpecInProgress --> SpecReady: Doc score ≥ 7 AND no open questions
    SpecReady --> InDevelopment: first TASKS row → In Progress
    InDevelopment --> Testing: all TASKS rows Done
    Testing --> Shipped: ship gate passes AND deploy row recorded
    Shipped --> [*]

    SpecInProgress --> SpecInProgress: /vskit:critique spec (decisions land)
    Testing --> InDevelopment: ship gate fails
    note right of Deprecated
        Deprecated is the ONLY
        hand-edited state — set
        in SPEC frontmatter.
        All others are computed.
    end note
    SpecReady --> Deprecated: SPEC frontmatter set
    Shipped --> Deprecated: SPEC frontmatter set
```

You'll move through these in order during your first adoption. When in doubt about what command to run next, ask `/vskit:project-status` (or eyeball the TASKS file) — the state tells you.

---

**Prerequisites:**
- Claude Code installed (or another AI assistant — the Stop hook is Claude-specific; adapt for others).
- A repo with at least a `CLAUDE.md` file or willingness to add one.
- `bash`, `git`, `jq` available on the host. Windows: use Git Bash or WSL.

---

## Step 1 — Drop the bundle in (2 min)

```bash
# From your target repo's root
mkdir -p docs/bundle
cp -r <path-to-this-bundle>/* docs/bundle/

# Or, if you're vendoring from a remote:
# git submodule add https://github.com/OWNER/bab.git docs/bundle
# git -C docs/bundle sparse-checkout set docs/bundle
```

You now have `docs/bundle/vertical-slices-ai-framework.md` in your repo. Read its §0 (invariants) and §0.1 (what it forces). If those two sections don't match your bet, stop here and pick a different bundle — vertical-slices-md-dev-kit is opinionated and only pays off if you accept the invariants.

## Step 2 — Scaffold the doc tree (3 min)

The spec's §1 canonical doc tree:

```bash
mkdir -p docs/{prds/draft,features,worklog,prototypes,incidents,process,technical}

# Touch the per-folder READMEs that explain why a folder may be empty
for d in prds features worklog prototypes incidents; do
  [ -f docs/$d/README.md ] || echo "# $d" > docs/$d/README.md
done

# Add the two technical baseline docs
[ -f docs/technical/ARCHITECTURE.md ] || cat > docs/technical/ARCHITECTURE.md <<'EOF'
# Architecture
TODO: system design + project-level risks
EOF

[ -f docs/technical/ENV.md ] || cat > docs/technical/ENV.md <<'EOF'
# Environment Variables
TODO: enumerate every env var this repo reads
EOF
```

## Step 3 — Install the Stop hook (5 min)

```bash
# Make the reference hook executable
chmod +x docs/bundle/scripts/worklog-stop-hook.sh

# Merge the .claude/settings.json snippet
mkdir -p .claude
# If .claude/settings.json doesn't exist:
cp docs/bundle/settings.json.snippet .claude/settings.json
# If it does, open both files and merge the "hooks" block by hand.
```

The hook reference path inside `.claude/settings.json` defaults to `docs/bundle/scripts/worklog-stop-hook.sh` (relative to the repo root). Adjust if you store the bundle elsewhere.

**Verify:** run any Claude Code turn and check that `docs/worklog/$(date +%Y-%m-%d).md` was created with one row. If not, see the spec §5.2 Failure mode section.

## Step 4 — Drop the CLAUDE.md snippet (3 min)

Open your `CLAUDE.md`. If it doesn't have a `## Commands` section, paste the snippet:

```bash
cat docs/bundle/templates/CLAUDE.md-snippet.md
```

Adjust the shell invocations to your repo's stack (the placeholders are obvious — `npm test`, `pytest`, whatever you use). The only line that MUST stay verbatim is the framework path pointer.

## Step 5 — Write your first PRD (10 min)

```bash
DATE=$(date +%Y-%m-%d)
SLUG=auth   # whatever your first slice is about
cp docs/bundle/templates/PRD.md docs/prds/draft/${DATE}-${SLUG}.md
$EDITOR docs/prds/draft/${DATE}-${SLUG}.md
```

Fill it in. Don't worry about getting it perfect — the next step is to grill it.

```bash
# In Claude Code, run:
# /vskit:review prd docs/prds/draft/<your-file>.md
```

If you haven't wired up `/vskit:review prd` as a real command yet, the manual version is: open the PRD with Claude, ask each of the 11 specialists in spec §2.1 to score it 0–10 against their lens. Iterate until all 9+.

When done, move the file from `draft/` to `docs/prds/`:

```bash
git mv docs/prds/draft/${DATE}-${SLUG}.md docs/prds/${DATE}-${SLUG}.md
```

## Step 6 — Spin up your first feature (10 min)

```bash
FEATURE=signup
mkdir -p docs/features/${FEATURE}
cp docs/bundle/templates/SPEC.md docs/features/${FEATURE}/SPEC.md
cp docs/bundle/templates/TASKS.md docs/features/${FEATURE}/TASKS.md
cp docs/bundle/templates/SCORE.md docs/features/${FEATURE}/SCORE.md
cp docs/bundle/templates/DECISIONS.md docs/features/${FEATURE}/DECISIONS.md
```

Edit the SPEC's frontmatter — at minimum set `Applies:` correctly per spec §4.2.1. A backend-only HTTP feature: `Applies: [dbschema, interface-contracts]`. A static-site feature: `Applies: [ux, prototype]`. A CLI library: `Applies: []`. Add `clauses` if the feature has invariant rules you want AI-graded continuously (§4.7 — "no PII in logs anywhere", "every write is audited", etc.).

Fill out SPEC §1 (problem), §2 (scope), §3 (ACs). Stop. Don't write code yet.

## Step 7 — Look at the worked example (5 min)

Don't go further until you've read `docs/bundle/example/features/demo-counter/` end-to-end. It shows what a populated feature folder actually looks like with realistic ACs, real DECISIONS rows, a scored SCORE.md, and a TASKS table you can pattern-match against.

```bash
ls docs/bundle/example/features/demo-counter/
cat docs/bundle/example/features/demo-counter/SPEC.md
```

If your SPEC looks thinner than the example's, fill it out before moving on.

## Step 8 — Score your first feature (5 min)

Manual version (until you wire `/vskit:score feature` as a real command): open the feature folder with Claude and ask it to score each of the 8 dimensions per the spec's §7.2 rubric. Record the 8 numbers in `SCORE.md`. Composite is the arithmetic mean of scored dimensions (per spec §7.3).

Your first score will be low. That is correct and honest — you have no tests yet, no logging yet, no implemented code. Do not waive. The score is the signal.

## Step 9 — Commit (2 min)

```bash
git add docs/
git commit -m "$(cat <<'EOF'
chore: adopt vertical-slices-md-dev-kit v2.0

Bundle in docs/bundle/. Doc tree scaffolded. First feature scored.

Closes-AC: bootstrap#AC-01
EOF
)"
```

The `Closes-AC:` trailer is the framework's traceability marker. The spec's `/vskit:audit-traceability` command scans for it on every commit.

## Step 10 — Run /vskit:report-overhead at the end of week 1 (1 min)

```bash
# Manual approximation until you wire /vskit:report-overhead:
wc -l docs/worklog/*.md
```

The spec's §5.3 default budget is 100k tokens/week. The Stop hook records token estimates per turn. After a week, sum and compare to budget. If you're under: keep going. If you're over for two consecutive weeks: spec §5.3 forces a scope reduction or a framework drop. That is the bundle being honest about its own cost.

---

## What you have now

- A repo with the canonical doc tree.
- A Stop hook auto-writing your worklog every turn.
- One PRD scored ≥9 across 11 lenses.
- One feature with a SPEC, TASKS, SCORE, DECISIONS.
- Commit trailers traceable to ACs.
- A weekly overhead measurement.

You're adopted. The spec is now your normative reference; this tutorial is throwaway.

## When things break

| Symptom | Likely cause | Fix |
|---|---|---|
| Worklog file not created after a turn | Stop hook not wired | Re-do step 3; verify the hook path in `.claude/settings.json` is correct |
| `[HOOK FAILURE]` rows in worklog | `worklog-stop-hook.sh` errored | Check stderr from the failing run; common cause is missing `jq` |
| Score stuck at 0 across the board | You scored before implementing | Expected. Score again after each meaningful change |
| Adopting feels like a lot of paperwork | You're scoping too big | Vertical slices. A feature should be 1–2 weeks max (per spec PRD rubric) |
| `/vskit:report-overhead` reports breach | Framework is costing more than it returns | Spec §5.3 — reduce scope or drop the framework. The bundle is fine with you dropping it |

## Where to go next

- See every command exercised in one continuous example → [`WALKTHROUGH.md`](./WALKTHROUGH.md) (`/vskit:init-framework` through `/vskit:ship`).
- Read [`vertical-slices-ai-framework.md`](./vertical-slices-ai-framework.md) §0, §0.1, and §4 before adding a second feature.
- Read [`CHANGELOG.md`](./CHANGELOG.md) before any future bundle upgrade.
- File issues / questions at the bundle's source repo.
