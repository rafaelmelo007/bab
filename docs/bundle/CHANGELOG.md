# Changelog — vertical-slices-md-dev-kit

All notable changes to **vertical-slices-md-dev-kit** (the bundle) are recorded here. Versions follow the spec's `**Version:**` frontmatter line in [`vertical-slices-ai-framework.md`](./vertical-slices-ai-framework.md) — that field is authoritative.

The format is loosely [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), adapted: the spec already structures changes by section, so entries reference spec sections rather than restate them (per INV-1).

---

## [2.0] — 2026-05-23

The "great rename" release. Every command moves to verb-first form and gains a `vskit:` namespace prefix to avoid collision with built-in Claude Code skills (`/init`, `/review`, `/security-review`, `/verify`). Twelve commands renamed, three deleted. Brand-identity artifacts (BRAND.md) dropped — the framework now has a descriptive name and no separate brand.

### Why this is MAJOR (breaking)
Every old command name stops working. Every adopter who already has muscle memory for `/prd-grill`, `/spec-grill`, `/deploy-run`, etc. needs to relearn. By the bundle's own versioning policy ([§versioning policy](#versioning-policy)), changes that break adopter workflows are MAJOR.

### Migration table (old → new)

| Old command | New command | Reason |
|---|---|---|
| `/round-table prd <path>` | `/vskit:review prd <path>` | "round-table" was an Arthurian/meeting metaphor; literal "review" survives translation |
| `/prd-grill <path>` | `/vskit:critique prd <path>` | "grill" was a cooking-as-interrogation metaphor; noun-verb order was backwards |
| `/spec-grill <slug>` | `/vskit:critique spec <slug>` | same metaphor; same ordering fix |
| `/spec-audit` | `/vskit:audit spec [<slug>]` | noun-verb backwards; parallels `/vskit:audit-traceability` |
| `/clause-audit` | `/vskit:clause audit` | broke its own subcommand family; rejoined it |
| `/deploy-check` | `/vskit:check deploy` | noun-verb backwards; consistent with new verb-first rule |
| `/backlog` | `/vskit:show-backlog` | bare noun gave no action signal |
| `/overhead` | `/vskit:report-overhead` | bare noun; adopters couldn't guess what it did |
| `/prd-end-to-end <path>` | `/vskit:run-pipeline prd <path>` | "end-to-end" wasn't a verb; renamed for clarity |
| `/prd-to-features <path>` | `/vskit:prd-to-features <path>` | kept; prefixed only |
| `/spec-to-tasks feature <slug>` | `/vskit:spec-to-tasks feature <slug>` | kept; prefixed only |
| `/implement feature <slug>` | `/vskit:implement feature <slug>` | kept; prefixed only |
| `/test feature <slug>` | `/vskit:test feature <slug>` | kept; prefixed only |
| `/score feature <slug>` | `/vskit:score feature <slug>` | kept; prefixed only |
| `/score-all` | `/vskit:score-all` | kept; prefixed only |
| `/prototype feature <slug>` | `/vskit:prototype feature <slug>` | kept; prefixed only |
| `/clause add\|remove\|update\|check\|list` | `/vskit:clause add\|remove\|update\|check\|list` | kept; prefixed only |
| `/clause check-all` | `/vskit:clause check-all` | kept; prefixed only |
| `/project-status` | `/vskit:project-status` | kept; prefixed only |
| `/next-task` | `/vskit:next-task` | kept; prefixed only |
| `/open-questions` | `/vskit:open-questions` | kept; prefixed only |
| `/run-tests` | `/vskit:run-tests` | kept; prefixed only |
| `/run-e2e` | `/vskit:run-e2e` | kept; prefixed only |
| `/deploy` | `/vskit:deploy` | kept; prefixed only |
| `/health-check` | `/vskit:health-check` | kept; prefixed only |
| `/security-review` | `/vskit:security-review` | kept; prefixed only |
| `/gen-prototype-index` | `/vskit:gen-prototype-index` | kept; prefixed only |
| `/audit-traceability` | `/vskit:audit-traceability` | kept; prefixed only |
| `/init-framework` | `/vskit:init-framework` | kept; prefixed only |
| `/init-prototypes` | `/vskit:init-prototypes` | kept; prefixed only |
| `/ship feature <slug>` | `/vskit:ship feature <slug>` | kept; prefixed only |
| `/ship-all` | `/vskit:ship-all` | kept; prefixed only |

### Deleted

| Old command | Use instead | Reason |
|---|---|---|
| `/deploy-run` | `/vskit:deploy` | `/deploy-run` was redundant with `/deploy` — five-judge unanimous |
| `/what-next` | `/vskit:next-task` | duplicated `/next-task` — same question, two names |
| `/feature-end-to-end <slug>` | `/vskit:ship feature <slug>` | duplicated `/ship feature` — same chain, two names |

### Removed
- **BRAND.md** — the framework has a descriptive name (`vertical-slices-md-dev-kit`); no separate brand identity needed for an internally-adopted bundle.

### How the renames were chosen
Five blind judges independently scored every command name (0–10) on clarity, ambiguity, verb-noun ordering, and consistency. Convergence was very high: the 12 worst names had ≥4-of-5 judge agreement on renaming. The unified rule applied: **`/<verb> <subject> [<args>]`** as the default. The full audit + per-command scoring lives in the parent conversation log.

### What didn't change
The eight scoring dimensions, the lifecycle states, the ship-gate semantics, the propagation contract, the 14-day clause staleness rule, and the §0 invariants are all unchanged. v2.0 is exclusively a naming and namespacing release.

### Compatibility
**No backward-compatibility shim.** Old command names do not work. Run a find-and-replace across your repo's worklog, CLAUDE.md, and any custom scripts. The migration table above is the complete diff.

---

## [1.8] — 2026-05-23

The "clauses" release. Adds a third class of feature requirement — invariant rules with AI-graded compliance checks — sitting alongside ACs (testable behavior) and NFRs (measured properties). Closes a real gap: properties that hold across the whole codebase and cannot be expressed as a single unit test.

### Added
- **§4.7 Clauses** — new feature-scoped artifact (`CLAUSES.md`). Each clause carries an ID, severity (Low/Medium/High/Critical), rule text, last spec check, last code check, top-5 enforcement files, and reasoning. Verdicts are PASS/FAIL/INDETERMINATE with a confidence percentage because the check is interpretive, not deterministic.
- **`Applies: clauses`** — opt-in declaration in SPEC frontmatter. Features without `clauses` in Applies don't have a CLAUSES.md and are not gated on it.
- **5 per-feature commands** in §8.2 — `/vskit:clause add`, `/vskit:clause remove`, `/vskit:clause update`, `/vskit:clause check`, `/vskit:clause list`. Add/update auto-run an initial check so a baseline verdict always exists.
- **2 global commands** in §8.3 — `/vskit:clause check-all` (re-check across all features) and `/vskit:clause audit` (read-only report of stale + failing clauses).
- **Ship-gate integration** in §10.3 — High/Critical FAIL @ confidence ≥ 80% is a **hard block**; Medium FAIL @ ≥ 80% or stale (>14 days) is a **soft block**. Clauses with confidence < 60% are escalated to INDETERMINATE per INV-3.
- **`templates/CLAUSES.md`** — copy-pastable template with active + removed/superseded tables.
- **Worked example** — `example/features/demo-counter/CLAUSES.md` ships 3 realistic clauses (one FAIL, one PASS, one stale) demonstrating all three ship-gate states.

### Why this isn't a 9th scoring dimension
The eight dimensions in §7 produce a continuous 0–10 score and feed a composite. Clauses produce a discrete pass/fail per rule and feed the ship gate directly. Forcing them into the composite would either dilute the existing dimensions or hide individual clause failures behind an averaged number. Per INV-3 — surface failures, don't smooth them. See §4.7 closing paragraph.

### Compatibility
Backward-compatible. Existing v1.7 adopters continue to work unchanged; adding `clauses` to a feature's `Applies:` is opt-in. The ship-gate rules added in v1.8 only fire on clauses that actually exist.

### Deferred to 1.9
- `/vskit:clause backfill` — propose initial clauses by reading SPEC + DECISIONS and surfacing candidate invariants.
- Per-clause scorer override via a `Scorer:` row field (recognized in v1.8 but not yet acted on by all bundled scorers).

---

## [1.7] — 2026-05-17

The "honest scoring" release. Security stops being skippable, the bundle starts measuring its own cost truthfully, and traceability becomes enforceable at the repo edge.

### Changed
- **§7.1 Security is always scored.** Reverses the v1.6 exemption that allowed Dim 7 to be `N/A` for non-HTTP / non-DB features. Even pure CLI libraries have supply-chain, log-leak, and input-trust surface — the new §7.2 Dim 7 rubric names what to look for so the score is meaningful, not vacuous.
- **§10.3 Ship gate is now two-tiered.** Hard block (security < 8, undone tasks, stale `last_scored_sha`, orphan decisions, ungated blockers) vs. soft block with logged waiver (composite < 8, non-security dimension < 7, E2E gaps). Bypass becomes auditable rather than invisible.
- **§5.3 Overhead is honest about estimates.** Token figures are wc-based heuristics; all consumers must surface a `Estimates marked ~` footer. Silent presentation of estimates as truth is now a Rule 12 violation.
- **§4.1 Lifecycle state is computed, never declared.** Removed the SPEC.md `Status` frontmatter field. `/vskit:project-status` derives state from observable signals (TASKS rows, score values, score history). `Deprecated` is the only hand-edited lifecycle signal.

### Added
- **§4.5 DECISIONS.md propagation contract.** Every decision row must cite the canonical file(s) it caused to change. Unresolved items become `DEF-NN` rows. A critique round cannot end with orphan rows.
- **§5.2.1 Pre-push hook.** Opt-in installation by `/vskit:init-framework`. Runs `/vskit:audit-traceability` + `/vskit:check deploy` and refuses the push on failure. `--no-verify` is the documented bypass.
- **§8.4 Orchestration commands.** `/vskit:ship feature`, `/vskit:run-pipeline prd`, `/vskit:ship`, `/vskit:ship-all` chain atomic commands. Halt-on-failure, resumable on disk state.
- **§4.2.1 `Applies:` declaration.** SPEC frontmatter lists which optional artifacts (dbschema / interface-contracts / ux / prototype) the feature actually needs. Undeclared artifacts are not required, not scored, not audited.
- **§4.6 Migration section.** Required in DBSCHEMA.md when a feature changes an existing table. Up/down/back-compat fields are mandatory; missing any is a Dim 7 defect.
- **§8.2 `/vskit:score` caching.** Skip scoring when `git diff <last_scored_sha>..HEAD -- <feature scope>` is clean. `--force` bypasses.

### Deferred to 1.8
- CI/CD server-side audit of `--no-verify` bypasses (mentioned in §5.2.1).
- Portfolio-level governance (cross-repo schemas / shared event buses). Explicitly out of scope per §1.

---

## [1.6] — (date not recorded in spec)

Renaming and namespace hygiene.

### Changed
- **`/grill-me prd` renamed to `/vskit:critique prd`.** Avoids collision with the host's user-facing `grill-me` skill.
- **`/grill-me feature` renamed to `/vskit:critique spec`.** Same reason.

### Added
- Pre-push hook reference implementation with the `# >>> framework v1.6 BEGIN/END` delimited block for idempotent re-installation.

> Earlier history before 1.6 is not reconstructible from the current spec text beyond the changes noted in 1.7. If you maintain a copy of pre-1.6 versions, file a PR to backfill this section.

---

## [1.3] — (date not recorded in spec)

The vertical-slice consolidation. PRD stops carrying feature-level content; per-feature data moves into SPEC / DBSCHEMA / INTERFACE-CONTRACTS.

### Removed from PRD
- §1 Feature Problem Statement → moved to SPEC §1
- §4 Solution Overview → moved to SPEC §1 + SPEC §10
- §5 Scope (In/Out) → moved to SPEC §2 per feature
- §8 Data Model Impact → moved to per-feature DBSCHEMA.md
- §9 Interface Contracts → moved to per-feature INTERFACE-CONTRACTS.md

This made the PRD a portfolio-level document and the SPEC the single source of truth for feature-scoped content, satisfying INV-1.

---

## Versioning policy

- **MAJOR** — invariant added, removed, or weakened. INV-1 through INV-5 are stable across MINOR releases.
- **MINOR** — new sections, new commands, new dimensions, new templates. Backward-compatible — existing adopters can upgrade without doc tree changes.
- **PATCH** — clarifications, wording fixes, rubric disambiguation. No new behavior.

The current numbering does not yet follow strict semver; expect that to land at 2.0.
