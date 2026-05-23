# vertical-slices-md-dev-kit
**AI framework to build solid software apps — PRDs, per-feature markdown specs (vertical slices), contract clauses, and ship gates.**

**Version:** 2.0
**Date:** 2026-05-23
**Status:** Active
**Scope:** Any repository that follows the vertical-slice, spec-first methodology.

---

## §0 Framework Invariants

These are the non-negotiable rules that every later section is read against. They are stated **here only** — no other section restates them.

**INV-1 — Single source of truth.** Every fact lives in exactly one file. Other files link, never restate. Applies to: problem framing, scope, acceptance criteria, lifecycle status, scores, ownership, dependencies.

**INV-2 — Computed over declared.** When a value can be derived from a more primitive source (git state, file presence, test exit code, score record), it MUST be derived — never re-typed. Manual declarations are allowed only where derivation is impossible.

**INV-3 — Fail loud.** No silent skip, no soft pass, no "approximate" data presented as authoritative. Telemetry that estimates must be labeled (`~`); gates that bypass must record a waiver row.

**INV-4 — Enforceability over aspiration.** A rule that cannot be checked by code, hook, or gate is not a rule — it is a hope. Hopes are written as `**Aspiration:**` and not used in any gate.

**INV-5 — Overhead is a first-class output.** The framework's own cost is measured and budgeted (§5.3) and surfaced (`/vskit:report-overhead`). A repo whose framework overhead exceeds its budget for two consecutive review windows MUST be dropped from the framework or have its scope reduced.

---

## §0.1 What this framework forces that `git` + `make` + `pytest` do not

Four things, defended here so every later section can be checked against them. If a section adds machinery that does not serve one of these four, that machinery is overhead and must be cut.

1. **Intent declared before code.** Git records what changed; the framework requires every commit to declare the PRD/SPEC AC it satisfies. Two enforcement levels:
   - **Rule (default):** `/vskit:audit-traceability` (§8.3) scans `git log <since>..HEAD` for the `Closes-AC: <feature-slug>#AC-NN` trailer and fails if any non-merge commit lacks one.
   - **Aspiration (opt-out):** a repo whose `CLAUDE.md` declares `Traceability: aspirational` is exempt from the audit and the trailer becomes an `**Aspiration:**` per INV-4.
2. **Quality measured per change, not per release.** `pytest` says pass/fail; the framework scores up to 8 named dimensions (per `Applies:`, §7.1) and refuses ship if any scored dimension falls below floor (§7, §10).
3. **Overhead measured per repo.** `make` runs whatever; the framework records token/wallclock cost of its own commands (§5.3) and forces a drop decision when the cost stops paying for itself.
4. **Decisions traceable from rationale to commit.** Git records the diff; `pytest` records pass/fail. The framework chains DECISIONS.md (rationale) → SPEC.md (current contract) → TASKS.md (`Decision: D-NN`) → commit trailer (`Closes-AC:` + `Decision:`) → `/vskit:audit-traceability`, so any line of merged code can be walked back to the question that motivated it (§4.5, §8.3).

Anything in this spec that does not trace to one of these four is up for deletion in the next revision.

---

## Overview

This framework standardizes how AI agents collaborate to produce, refine, implement, and score software specifications across all repos. The primary units of work are **PRDs**, **Features**, and **Tasks** — there are no time-boxed sprints. Work flows from discovery to shipment driven by feature readiness and quality gates, not calendar cycles.

Every repo that adopts it gets:

- A **consistent doc tree** — agents and humans navigate identically across all projects
- A **multi-agent role system** — each agent has a fixed responsibility boundary
- A **PRD → Feature → Task → Code → Test pipeline** driven entirely by markdown artifacts
- A **persistent scoring system** with an 8-dimension rubric built into this document
- A **work-log** auto-written via hook after every turn — no manual logging
- A **prototype exposure system** behind basic auth for UI-facing features
- A **target-aware command library** (`/vskit:critique prd`, `/vskit:critique spec`, `/vskit:score feature`, `/vskit:score-all`, etc.)
- **Orchestration commands** (§8.4) that chain the atomic commands end-to-end so a full feature — grill, decisions, tasks, code, tests, score, prototype — runs as a single invocation

---

## 1. Canonical Repository Doc Tree

Every repo must maintain this structure. Folders not applicable to the project contain only a `README.md` explaining why they are empty.

```
docs/
├── PRD.md                          # Canonical PRD (promoted from prds/draft/)
│
├── prds/
│   ├── README.md
│   ├── _TEMPLATE.md
│   ├── draft/                      # PRDs under review process
│   └── <YYYY-MM-DD>-<slug>.md      # Promoted, versioned PRDs
│
├── features/
│   └── <feature-slug>/
│       ├── SPEC.md                 # Vertical-slice spec — sole source of truth
│       ├── TASKS.md                # Implementation tasks derived from SPEC.md ACs
│       ├── SCORE.md                # Persistent quality scores (8 dimensions)
│       ├── DECISIONS.md            # Decision log — populated by /vskit:critique spec (§4.5)
│       ├── DBSCHEMA.md             # ONLY if "dbschema" in SPEC Applies (§4.2.1)
│       ├── INTERFACE-CONTRACTS.md  # ONLY if "interface-contracts" in SPEC Applies
│       └── prototypes/             # ONLY if "prototype" in SPEC Applies
│           ├── index.html
│           └── assets/
│
├── worklog/
│   └── <YYYY-MM-DD>.md             # Auto-written via Stop hook — all prompts + duration
│
├── prototypes/
│   └── index.html                  # Auto-generated listing of all feature prototypes
│
├── incidents/
│   ├── README.md
│   ├── _TEMPLATE.md
│   └── INC-<NNN>.md
│
├── process/
│   ├── QA-GATE.md                  # Feature ship quality gate checklist
│   └── INC-TEMPLATE.md             # Incident report template
│
├── technical/
│   ├── ARCHITECTURE.md             # System design + project-level risks
│   ├── ENV.md                      # All env vars documented
│   └── OBSERVABILITY.md            # Logging, metrics, alerting contracts
│
└── bundles/
    └── <bundle-name>.md            # Reusable prompt/instruction bundles (apply to any repo)
```

**Explicitly absent** (removed — no duplication, no unused slots):
- `docs/sprint/` — no sprints
- `docs/project/` — no STATUS.md, no DIARY.md (worklog replaces both)
- `docs/board-history/` — `git log` is the archive
- `docs/drift-reports/` — scoring system is sufficient
- `docs/tasks/BACKLOG.md` — TASKS.md per feature is the only task artifact
- `docs/bugs/` — bug reports go in `incidents/` (already exists; bugs are incidents that didn't reach prod)
- `docs/code-reviews/` — inline in commit messages and PR descriptions; not a separate artifact
- `docs/FAQ.md` and `docs/FAQ-INDEX.md` — repo-level FAQ lives in `CLAUDE.md`; per-feature FAQ lives in SPEC §9 Open Questions

**Out of scope.** This framework operates **per repo, per feature**. Cross-repo and cross-feature dependencies — shared schemas, shared event buses, portfolio-level service contracts — are NOT tracked here. Track them in a portfolio-level `CLAUDE.md` or equivalent shared registry. A future framework iteration may add portfolio tracking; until then, do not claim portfolio-wide governance.

---

## 2. Agent Roster

Each agent has a fixed role, a fixed set of files they own, and a defined input/output contract. No agent acts outside its role boundary without a written handoff.

### 2.1 Role Definitions

| Agent | Slug | Owns | Does NOT own |
|-------|------|------|--------------|
| Product Owner | `product-owner` | PRD.md, prds/ | Implementation details, task assignment |
| Task Manager | `task-manager` | features/*/TASKS.md | Code, specs, PRDs |
| Backend Lead | `backend-lead` | server/ code, INTERFACE-CONTRACTS.md (API side), DBSCHEMA.md review | Frontend code |
| Frontend Lead | `frontend-lead` | client/ code, INTERFACE-CONTRACTS.md (client side) | Server code |
| DB Architect | `db-architect` | DBSCHEMA.md, migrations/ | Application logic |
| Testing Lead | `testing-lead` | *.spec.ts, *.test.ts, e2e suites, SCORE.md §test-coverage | Production code |
| DevOps Lead | `devops-lead` | Dockerfile, docker-compose.yml, .github/workflows/, technical/ENV.md | Application code |
| Security Specialist | `security-specialist` | §4 NFR security entries in SPECs, incidents/ | Feature implementation |
| Performance Specialist | `perf-specialist` | §4 NFR latency/quota entries in SPECs, technical/OBSERVABILITY.md | Business logic |
| Prompt Engineer | `prompt-engineer` | SPEC.md structure, DECISIONS.md, worklog/ | Implementation code |
| UX Specialist | `ux-specialist` | prototypes/, UX sections of SPECs | Backend code |

### 2.2 Role Enforcement (per INV-4)

Role boundaries are **enforced by actual subagent invocation**, not by voluntary discipline. When a command operates on behalf of a named agent (e.g., `/vskit:score` runs Documentation through `prompt-engineer`, Security through `security-specialist`), the implementation MUST invoke that subagent via the Agent tool with the matching `subagent_type`. The Stop hook (§5.2) parses Agent-invocation lines from the transcript and records which subagent ran in the worklog `Agent(s)` column.

**When the main thread does owner-tagged work directly** (without invoking the named subagent), the worklog row MUST be tagged `role: self-review` and the resulting score row in SCORE.md MUST be prefixed `**[self-review]**`. Per INV-3, self-review is logged honestly rather than forbidden by a rule no one can enforce.

**Handoff protocol** (when one agent's output is the input to another):
1. Append `**Handoff → <agent-slug>:** <specific task>` to the relevant file
2. Update TASKS.md row Status (lifecycle is computed per §4.1; only TASKS rows are hand-edited)
3. The next command run invokes the named subagent

---

## 3. PRD Pipeline

### 3.1 Flow

```
Idea / User Request
       │
       ▼
  [product-owner] drafts PRD
  → docs/prds/draft/<YYYY-MM-DD>-<slug>.md
       │
       ▼
  /vskit:review prd <prd-path>
  ┌──────────────────────────────────────────────────────────────────┐
  │ 11 specialist subagents launched IN PARALLEL — each scores the  │
  │ PRD independently on their domain (0–9) with written critique.  │
  │ Any score < 9 → targeted revision → repeat until all ≥ 9.      │
  │ Scores + key concerns recorded in PRD §Round-Table Scores table │
  └──────────────────────────────────────────────────────────────────┘
       │
       ▼
  [product-owner] promotes PRD
  → docs/prds/<YYYY-MM-DD>-<slug>.md
  → updates docs/PRD.md (if primary product PRD)
       │
       ▼
  /vskit:prd-to-features <prd-path>
  [product-owner + task-manager] extract feature list,
  create docs/features/<slug>/ stubs for each feature
       │
       ▼
  /vskit:critique spec <slug>  ← per feature
  [prompt-engineer + domain specialists] interrogate SPEC.md
  until Documentation score ≥ 8
  → DECISIONS.md row appended per decision (D-NN)
  → SPEC.md / DBSCHEMA.md / INTERFACE-CONTRACTS.md updated in same run
       │
       ▼
  /vskit:spec-to-tasks feature <slug>  ← per feature
  [task-manager] breaks ACs into TASKS.md rows
  → TASKS rows tagged `Decision: D-NN` when driven by a DECISIONS entry
       │
       ▼
  /vskit:implement feature <slug>
  [backend-lead, frontend-lead, db-architect] implement all Pending tasks
  → commits carry `Closes-AC:` and (when applicable) `Decision: D-NN` trailers
       │
       ▼
  /vskit:test feature <slug>
  [testing-lead] run feature-scoped tests
       │
       ▼
  /vskit:score feature <slug>
  8 scoring subagents IN PARALLEL → SCORE.md updated
  Ship gate: composite ≥ 8.0, no dimension < 7, security ≥ 8
```

**Orchestration shortcut.** Steps from `/vskit:critique spec` through `/vskit:score feature` (and `/vskit:prototype feature` if applicable) chain together as `/vskit:ship feature <slug>`. The full chain from `/vskit:review prd` through all derived features is `/vskit:run-pipeline prd <prd-path>`. See §8.4.

### 3.2 PRD Template (slim — per INV-1)

The PRD owns **portfolio-level** product framing only. Per-feature problem statements, scope, data model, and interface contracts live in each feature's SPEC.md / DBSCHEMA.md / INTERFACE-CONTRACTS.md. The PRD never restates feature-scoped content.

```markdown
# <Product Name> PRD
**Version:** X.Y
**Status:** draft | in-review | approved | superseded
**Author:** product-owner
**Last updated:** YYYY-MM-DD

## §1 Product Vision
[One paragraph: what bet is this product making? Portfolio-level only — per-feature problem statements live in SPEC.md §1.]

## §2 Goals & Success Metrics
[Portfolio-wide measurable goals. Each metric MUST trace to one or more feature ACs per Dim 4.]

## §3 Customer Evidence
### §3.1 User Research (≥3 verbatim signals)
### §3.2 Pre-Build Assumption Tests (PRE-01..N)

## §6 Features & Epics
[F-01, F-02... — each line is a slug + one-sentence intent + link `→ ./features/<slug>/SPEC.md`. No per-feature scope, ACs, or NFRs here.]

## §7 Non-Functional Requirements (portfolio-wide only)
[Cross-cutting baselines: browser support, WCAG baseline, auth model, rate-limit defaults. Per-feature NFRs live in SPEC §4.]

## §10 Metrics & Instrumentation (portfolio-wide only)
[Portfolio dashboards, SLO rollups. Per-feature metrics belong in SPEC §4 / OBSERVABILITY.md.]

## §11 Pricing & Freemium Impact
## §12 Growth & Acquisition

## §13 Open Questions (portfolio-level)
| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|

## §14 Dependencies (portfolio-level)
[External services, third-party APIs, cross-app contracts. Per-feature internal deps stay in SPEC §8.]

## Round-Table Scores
| Specialist | Score | Round | Key Concerns |
|------------|-------|-------|--------------|

## Score History
| Date | Round | Min Score | Specialists < 9 | Notes |
|------|-------|-----------|-----------------|-------|

> Appended by `/vskit:review prd` after every round. Per INV-1, consecutive identical rows (same Min Score AND same Specialists < 9 set) are deduplicated: the most recent row's Date column expands to a range `<first>..<last>`.
```

**Removed from PRD vs. v1.3** (now SPEC-canonical per INV-1):
- §1 *Feature* Problem Statement → SPEC §1
- §4 Solution Overview → SPEC §1 + SPEC §10 Implementation Notes
- §5 Scope (In/Out) → SPEC §2 (per feature); portfolio scope = §6 feature list
- §8 Data Model Impact → per-feature DBSCHEMA.md
- §9 Interface Contracts → per-feature INTERFACE-CONTRACTS.md

### 3.3 PRD Round-Table Scoring Rubric

Each of the 11 specialists in §2.1 scores the PRD **0–10** (same scale as feature scoring in §7.2 — unified per INV-1) through their domain lens. Scores are recorded in the PRD `## Round-Table Scores` table per round. Any score < 9 → revise PRD → re-score all 11. Per-integer disambiguation: see §7.2 table.

| Agent | Scores PRD against (portfolio-level only) |
|-------|--------------------|
| product-owner | §1 vision is one clear bet · §2 metrics are testable · §3 customer evidence (≥3 verbatim signals) · §13 open questions have owners |
| task-manager | §6 features sized for SPEC decomposition · no feature line implies > ~2 weeks of work · §14 dependencies are explicit |
| backend-lead | §6 feature list covers backend complexity · §7 portfolio NFRs name auth + rate-limit baseline (per-feature data model lives in SPECs) |
| frontend-lead | §7 portfolio NFRs include UX baseline (browser support, WCAG, loading/empty/error conventions) |
| db-architect | §6 features that touch shared data are flagged · §14 names any shared-schema dependencies (per-feature schema lives in DBSCHEMA.md) |
| testing-lead | every §2 metric is measurable · §7 NFRs are testable · §3.2 pre-build assumption tests present |
| devops-lead | §10 portfolio metrics/dashboards listed · §14 dependencies named with versions · env vars enumerable |
| security-specialist | §7 NFR security baseline present (auth model, input-surface posture, rate limits) · no PII in §10 metrics |
| perf-specialist | §7 NFR latency/quota baseline quantified (not "fast") · §10 SLI/SLO defined at portfolio level |
| prompt-engineer | §3.1 user research is ≥3 verbatim signals (not paraphrases) · §13 open questions have resolution paths |
| ux-specialist | §6 feature list flags user-facing surfaces · §7 NFRs include UX baseline (per-feature UX lives in SPEC §4) |

**Per-score meaning:**

| Score | Meaning |
|-------|---------|
| 10 | Domain concern fully addressed + exceptional clarity / stretch criteria met |
| 9 | Domain concern fully addressed, zero defects; ready to promote |
| 7–8 | Substantially addressed; minor gaps named in PRD §13 |
| 5–6 | Partially addressed; revision required |
| 0–4 | Not addressed or fundamentally flawed |

---

## 4. Feature Flow

### 4.1 Feature Lifecycle States — computed, not declared (INV-2)

```
Backlog → Spec In Progress → Spec Ready → In Development → Testing → Shipped
```

**Status is NEVER hand-edited in SPEC.md.** The SPEC.md `Status` field is removed. `/vskit:project-status` computes it from observable state:

States are evaluated **top-to-bottom**; the first matching row wins. This guarantees every observable repo state maps to exactly one lifecycle state. Deprecated is the sole hand-edited signal (set in SPEC frontmatter); all other states are pure functions of file contents.

| Priority | State | Computed condition |
|---------|-------|--------------------|
| 0 | Deprecated | SPEC.md frontmatter contains `Deprecated: <YYYY-MM-DD> — <reason>` |
| 1 | Backlog | feature folder exists; SPEC.md missing or has no §3 ACs |
| 2 | Spec In Progress | SPEC.md exists with §3 ACs AND (Documentation score < 7 OR §9 has unresolved Open Questions) |
| 3 | Spec Ready | Documentation score ≥ 7 AND no unresolved Open Questions AND (TASKS.md has zero rows OR every row is `Pending`) |
| 4 | Shipped | All TASKS rows `Done` AND ship gate passed (§10.3) AND ≥1 deploy row exists in SCORE.md `## Score History` |
| 5 | Testing | All TASKS rows `Done` (ship gate not yet passed OR no deploy row recorded) |
| 6 | In Development | TASKS.md has ≥1 row with Status `In Progress` or `In Review`, OR TASKS.md has a mix of `Pending` and `Done` rows |

**Deprecated semantics.** A Deprecated feature is read-only product surface: `/vskit:spec-to-tasks` refuses to add new tasks; `/vskit:implement` refuses to run; `/vskit:score` continues to run so regressions still surface; code is **not** auto-deleted. To un-deprecate, remove the SPEC frontmatter line and the lifecycle recomputes from observable state. Deletion happens only via an explicit Incident with `git rm` of the feature folder.

`/vskit:project-status` reads all features live and prints — nothing written to disk. Hand-editing of TASKS.md row Status (`Pending → In Progress → In Review → Done`) is the **only** writable lifecycle signal.

PRD `Status` (draft/in-review/approved/superseded) is a separate concept: it tracks the **PRD document's review state**, not work progress, and remains hand-edited by the product-owner during §3.1 review iterations.

### 4.2 Feature Folder Initialization

When `/vskit:prd-to-features` runs, the task-manager creates SPEC.md, TASKS.md, SCORE.md, and DECISIONS.md unconditionally. The rest depend on the SPEC's `Applies:` declaration (§4.2.1).

```
docs/features/<feature-slug>/
├── SPEC.md                    (stub from §4.3 template — Applies must be declared)
├── TASKS.md                   (headers only — populated by /vskit:spec-to-tasks)
├── SCORE.md                   (all dimensions initialized at 0)
├── DECISIONS.md               (header only — appended by /vskit:critique spec; §4.5)
├── DBSCHEMA.md                (created ONLY if "dbschema" in Applies)
├── INTERFACE-CONTRACTS.md     (created ONLY if "interface-contracts" in Applies)
└── prototypes/                (created ONLY if "prototype" in Applies)
```

### 4.2.1 The `Applies:` declaration

SPEC frontmatter `Applies:` lists which optional artifacts this feature requires. Valid values:

| Value | Required file/folder | Required because |
|-------|---------------------|------------------|
| `dbschema` | `DBSCHEMA.md` | Feature reads or writes a persistent store |
| `interface-contracts` | `INTERFACE-CONTRACTS.md` | Feature exposes HTTP, WS, or RPC endpoints |
| `ux` | SPEC §4 has UX-specialist NFRs filled | Feature has user-facing surface |
| `prototype` | `prototypes/` folder | SPEC marked `Prototype: required` |
| `clauses` | `CLAUSES.md` | Feature has invariant rules requiring ongoing AI-graded compliance checks (§4.7) |

Undeclared artifacts are NOT required, NOT scored against, NOT audited. A static-site feature with `Applies: [ux, prototype]` skips DBSCHEMA and INTERFACE-CONTRACTS entirely. A CLI library with `Applies: []` runs SPEC + TASKS + SCORE only. Per INV-4 — enforce only what is real.

### 4.3 SPEC.md Canonical Template

Every SPEC.md must follow this exact structure. Sections may be marked `N/A — <reason>` but must not be omitted.

```markdown
# <Feature Name> — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** Critical | High | Medium | Low
**Applies:** [dbschema, interface-contracts, ux, prototype]   *(per §4.2.1 — only declared artifacts are required, scored, or audited)*
**Touches:** [<git pathspec>, …]   *(code paths in this feature's scope — used by /score for cache invalidation. E.g., `server/auth/**`, `client/auth/**`. Empty list = no code, score is folder-driven only.)*
**Prototype:** required | approved | N/A
**Deprecated:** *(omit unless deprecated; format: `YYYY-MM-DD — <reason>`. Sole hand-edited lifecycle signal per §4.1.)*
**Agents:** <comma-separated list of agents involved>
**Source:** docs/PRD.md §6 (Features & Epics) — F-<NN> line | docs/prds/<file>.md §6
**Last updated:** YYYY-MM-DD
**Score:** See SCORE.md

---

## §1 Problem Statement
[One paragraph: what pain does this feature eliminate and for whom?]

## §2 Scope
### In Scope
### Out of Scope

## §3 Acceptance Criteria
> Each AC must be independently verifiable. Mark `[x]` when test passes.
> Use `**GAP (deferred):**` for known gaps.

- [ ] AC-01: <specific, testable statement>
- [ ] AC-02: ...

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | < X ms at Y rps |
| Error budget | < Z% 5xx over 30 days |
| Browser support | Latest 2: Chrome, Edge, Firefox; Safari best-effort |
| Quota enforcement | <limits and enforcement mechanism> |
| Accessibility | WCAG 2.1 AA for all interactive elements |
| Security | <auth model, input validation, rate limiting> |

## §5 Data Model
> Schema lives in **DBSCHEMA.md** (single source of truth). Do not restate tables, columns, or indexes here.
> Link: ./DBSCHEMA.md

## §6 Interface Contracts
> Contracts live in **INTERFACE-CONTRACTS.md** (single source of truth). Do not restate endpoints, payloads, or WS events here.
> Link: ./INTERFACE-CONTRACTS.md

## §7 Test Specification

> Test IDs use the `TC-NN` prefix (test case) to avoid collision with TASKS.md `T-NN` (task) IDs.

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit | | |
| TC-02 | Integration | | |
| TC-03 | E2E | | |

## §8 Cross-References
- **PRD:** docs/PRD.md §6 — F-<NN> line for this feature
- **Decisions:** DECISIONS.md  *(rationale journal; updated by /vskit:critique spec)*
- **DB Schema:** DBSCHEMA.md  *(only if "dbschema" in Applies)*
- **Interface Contracts:** INTERFACE-CONTRACTS.md  *(only if "interface-contracts" in Applies)*
- **Tasks:** TASKS.md
- **Blocked-by:** [<other-feature-slug>, …]  *(optional. Ship gate refuses if any listed feature is not Shipped. Use sparingly — cross-feature coupling is a code smell. Per §1, cross-repo blockers are out of scope; only sibling features in the same repo are tracked.)*

## §9 Open Questions
| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|

## §10 Implementation Notes
[Non-obvious constraints, workarounds, invariants only.]
```

### 4.4 TASKS.md Template

```markdown
# Tasks — <Feature Name>

**Feature:** <slug>
**Source:** SPEC.md, DECISIONS.md
**Last updated:** YYYY-MM-DD

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | | backend-lead | High | Pending | AC-01, AC-03 | — |
| T-02 | | backend-lead | High | Pending | AC-04 | D-03 |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
```

### 4.5 DECISIONS.md Template

DECISIONS.md is the **rationale journal** for a feature. Per INV-1, it never restates what SPEC/DBSCHEMA/INTERFACE-CONTRACTS already say — it records *why* those files now say what they say. Every row MUST cite the canonical file(s) it caused to change; an unresolved row (empty `Updates` column) is a Documentation defect (§7.2 Dim 1).

```markdown
# Decisions — <Feature Name>

**Feature:** <slug>
**Source:** /vskit:critique spec <slug> sessions
**Last updated:** YYYY-MM-DD

> This file is the audit trail for design decisions made during critique rounds.
> The decisions themselves live in SPEC.md / DBSCHEMA.md / INTERFACE-CONTRACTS.md.
> If you change a decision later, append a new row with `Supersedes: D-NN` — never edit history.

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | YYYY-MM-DD | security-specialist | Should AC-04 require MFA for admin endpoints? | Yes, TOTP only (no SMS) | SMS deliverability + SIM-swap risk; TOTP libs available in target stack | SPEC.md §3 AC-04, §4 Security row | — |
| D-02 | YYYY-MM-DD | db-architect | Soft-delete vs hard-delete for user records? | Soft-delete with 30d purge job | GDPR right-to-erasure deadline + audit trail need | DBSCHEMA.md users.deleted_at | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | Per-tenant rate limits | Out of scope for v1 — single-tenant launch | Multi-tenant epic opens |
```

**Propagation contract** (enforced by `/vskit:critique spec` and audited by `/vskit:score feature` Dim 1):

| Decision affects… | Canonical file updated in the SAME spec-grill run | DECISIONS row `Updates` value |
|---|---|---|
| Acceptance criterion | SPEC.md §3 | `SPEC.md §3 AC-NN` |
| NFR (latency / auth / quota) | SPEC.md §4 | `SPEC.md §4 <row>` |
| Scope cut or expansion | SPEC.md §2 | `SPEC.md §2 In/Out` |
| Open question resolution | SPEC.md §9 (Status → Resolved) | `SPEC.md §9 Q-NN` |
| Schema change | DBSCHEMA.md | `DBSCHEMA.md <table>.<column>` |
| Endpoint / payload change | INTERFACE-CONTRACTS.md | `INTERFACE-CONTRACTS.md <endpoint>` |
| Pure deferral (no current change) | DECISIONS.md `## Deferred Items` | `DEF-NN` |

A critique round MUST NOT end with any row whose `Updates` column is empty *and* whose item is not in `## Deferred Items`. Per INV-3, an undecided decision is logged as `DEF-NN`, not silently dropped.

### 4.6 DBSCHEMA.md Migrations Section

When a feature changes an **existing** table (column rename, drop, type-change, constraint change, index change), DBSCHEMA.md MUST contain a `## Migrations` section for that change. Additive changes that cannot break existing readers — new column with default, brand-new table — are exempt.

Three fields are mandatory per migration; missing any field is a Dim 7 (Security) defect because migration risk lives there.

```markdown
## Migrations

### M-01 — <YYYY-MM-DD> — <one-line summary>

**Up steps**
1. <ordered SQL or migration-tool step>
2. ...

**Down steps (rollback)**
1. <ordered SQL or migration-tool step to revert M-01>
2. ...

**Back-compat assertion**
<one paragraph naming which old code paths continue to work between the Up and the corresponding code release, and for how long. If no back-compat window is needed — e.g. coordinated single-deploy — state that explicitly and justify.>
```

**Why required.** A migration without a rollback is a one-way door. A migration without a back-compat assertion is an outage waiting for a deploy ordering accident. Per INV-3 (fail loud), refusing the rollback up front (with justification) is acceptable; silently not having one is not.

`/vskit:score feature` Dim 7 checks: (a) the section exists when the Up steps touch an existing table, (b) all three fields are non-empty, (c) the back-compat assertion does not contain only "TBD" or "N/A" without justification.

### 4.7 Clauses — invariant rules with confidence-graded checks

**New in v1.8.** Clauses are the third class of feature-scoped requirement, alongside ACs (§4.3 §3) and NFRs (§4.3 §4). They cover a gap the other two cannot.

| Artifact | Tests… | Cadence | Verdict shape |
|---|---|---|---|
| AC (SPEC §3) | Behavior on one request | Per turn (test suite) | Boolean (pass/fail) |
| NFR (SPEC §4) | Aggregate measurable property | Per release (load test) | Number vs. threshold |
| **Clause (CLAUSES.md)** | **Invariant property that must hold across the codebase** | **Re-checked on demand** | **PASS / FAIL / INDETERMINATE + confidence 0–100% + reasoning** |

**When to use a clause vs. an AC:** if the rule can be expressed as one test against one request, write an AC. If the rule is a property that has to hold across many code paths and would require many tests to verify deterministically — "no PII anywhere in logs," "no protected route lacks auth middleware," "every write op produces an audit row" — write a clause.

**Storage.** `docs/features/<slug>/CLAUSES.md` per the template referenced from §4.2.1. Created on first `/vskit:clause add` or by `/vskit:init-framework` if `clauses` is in the feature's `Applies:` at scaffold time.

**Per-clause record.** Every active clause carries:

- `CLA-NN` — sequential ID
- **Rule** — one declarative sentence ("New users must accept terms before any data write")
- **Severity** — `Low` | `Medium` | `High` | `Critical`. Defaults to `Medium`. Drives ship-gate behavior per §10.3.
- **Added** — date the clause was created
- **Last spec check** — date · verdict (`PASS` / `FAIL` / `INDETERMINATE`) · confidence (`0–100%`) · reasoning paragraph
- **Last code check** — same shape, against the implementation
- **Top 5 enforcement files** — paths the scorer judges most relevant to upholding the clause, ordered by relevance

**Confidence.** Clauses are AI-graded; verdicts come with a confidence score because the underlying check is interpretive, not deterministic. A 100% confidence verdict is rare and suspect. Typical PASS lands at 80–95%; typical FAIL at 70–90%. Confidence below 60% should be treated as INDETERMINATE per INV-3 (don't present soft answers as hard ones).

**Staleness.** A clause whose `Last code check` is older than **14 days** is **stale**. Stale clauses with severity Medium or higher count as INDETERMINATE for ship-gate purposes — a soft block until refreshed. Run `/vskit:clause check <slug>` to re-evaluate.

**Removal.** Active clauses move to the `## Removed / Superseded Clauses` table on removal, preserving the final verdict and reason. Same INV-1 audit pattern as DECISIONS supersession. Silent deletion is forbidden.

**Update history.** Editing a clause's rule text or severity creates a new `CLA-NN+1` row and moves the old row to `## Removed / Superseded Clauses` with `Supersedes: CLA-NN` marked. The new clause is auto-checked before the command exits so a baseline verdict exists.

**Drift coupling.** A clause whose last code-check verdict is FAIL surfaces in `SCORE.md ## Drift Findings` alongside the existing AC-drift findings. The two channels of drift detection (per-AC drift from Dim 1; per-clause drift from `/vskit:clause check`) share one report but originate from different commands.

**Scorer.** The default scorer for `/vskit:clause check` is `security-specialist`, since most clauses encode invariants that are security-shaped. A clause may override via a `Scorer:` field in its row (e.g., `Scorer: perf-specialist` for a latency-invariant clause).

**Why this isn't a 9th scoring dimension.** The eight dimensions in §7 produce a continuous 0–10 score and feed a composite. Clauses produce a discrete pass/fail per rule and feed the ship gate (§10.3) directly. Forcing them into the composite would either dilute the existing dimensions or hide individual clause failures behind an averaged number. Per INV-3 — surface failures, don't smooth them.

---

## 5. Work-Log System

### 5.1 Format: `docs/worklog/YYYY-MM-DD.md`

Auto-written by a `Stop` hook after every Claude turn. Never hand-edited.

```markdown
# Work Log — YYYY-MM-DD

## HH:MM UTC

| # | Command / Prompt | Agent(s) | Duration | Tokens (est.) | Outcome |
|---|-----------------|----------|----------|---------------|---------|
| 1 | `/vskit:review prd docs/prds/draft/2026-05-17-auth.md` | 11 parallel subagents | 8 min | ~12k | PRD promoted; all scores ≥ 9 |
| 2 | `/vskit:prd-to-features docs/prds/2026-05-17-auth.md` | task-manager | 3 min | ~4k | 5 feature folders created |
| 3 | `/vskit:implement feature auth` | backend-lead, frontend-lead | 42 min | ~75k | 8 tasks Done; 38/38 tests green |

**Total:** 53 min | ~91k tokens | Features touched: auth | Tasks completed: 8
```

### 5.2 Stop Hook Reference Implementation

The Stop hook runs after each Claude Code turn and appends one row to `docs/worklog/$(date +%Y-%m-%d).md` (creating the file with the §5.1 header if missing).

**Hook configuration** — `.claude/settings.json` per repo:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "bash <framework-bundles-dir>/worklog-stop-hook.sh"
      }]
    }]
  }
}
```

`<framework-bundles-dir>` is the absolute path on the host where this framework's hook scripts are installed. Each repo sets the value verbatim — the framework itself prescribes the contract, not the location.

**Hook behavior contract** — the script receives the Stop event payload on stdin and must:

1. Read `prompt`, `session_id`, `cwd`, and `transcript_path` from the stdin JSON.
2. Compute **duration** from the previous Stop entry's timestamp in today's worklog (0 if first entry of the day).
3. Estimate **tokens** via `wc -c` on the transcript delta since the last entry, divided by 4 (rough heuristic — flagged as `~` in the worklog).
4. Detect **agents** in this order: (a) parse Agent-tool-invocation lines from the transcript delta (these carry exact subagent identity); (b) if none, regex-match agent slugs from §2.1 against the prompt body; (c) fall back to `claude` only if both fail.
5. Detect **outcome** by storing the first line of the last assistant message verbatim (no keyword guessing — keyword-based outcomes silently misclassified nuance).
6. **Sanitize markdown-breaking characters in every column** before writing: replace `|` with `\|`, replace any newline (`\n`, `\r`) with a single space, replace backtick (`` ` ``) with `'`. Apply to `prompt`, `agents`, and `outcome`. Unsanitized values WILL corrupt the worklog table on the first prompt containing a pipe.
7. Append one row to the worklog table. If today's worklog file does not exist, create it with the §5.1 header.

**Honesty rule (INV-3).** The token column is always prefixed `~` because it is a wc-based estimate, not a true count. Any consumer that reads worklog data (`/vskit:report-overhead`, `/vskit:project-status`, audit tooling) MUST surface a `Estimates marked ~` footer when displaying token totals. Silent presentation of estimates as truth is forbidden.

**Failure mode (fail-loud per Rule 12):** if the hook exits non-zero, the row is prefixed with `**[HOOK FAILURE]**` and the error is written to stderr. The hook never silently swallows. If `<framework-bundles-dir>/worklog-stop-hook.sh` is not present on the host, the hook command itself will fail — `.claude/settings.json` surfaces this on every Stop event until the script is installed.

**Canonical script location:** `<framework-bundles-dir>/worklog-stop-hook.sh` — referenced (not copied) from each repo's settings.json. The framework ships the reference implementation alongside this spec; install it on the host once, point every repo at the same path.

### 5.2.1 Pre-Push Hook (opt-in, installed by `/vskit:init-framework`)

Repo-edge enforcement for INV-3 (fail loud) and INV-4 (enforceability). When the user runs `git push`, the hook runs `/vskit:audit-traceability` then `/vskit:check deploy` and refuses the push on either failure. `--no-verify` is the documented waiver — it bypasses the hook, leaving `/vskit:check deploy` at deploy time as the last unbypassable line of defense.

**Installation.** Created at `.git/hooks/pre-push` by `/vskit:init-framework` when the operator accepts the prompt. Permission `0755`. Idempotent: re-installation replaces the framework-owned block delimited by `# >>> framework v1.6 BEGIN` / `# <<< framework v1.6 END`, preserving any user-added hook logic outside the delimiters.

**Reference implementation.**

```bash
#!/usr/bin/env bash
# >>> framework v1.6 BEGIN
set -e
echo "[framework] pre-push: /vskit:audit-traceability"
if ! /vskit:audit-traceability; then
  echo "[framework] traceability check failed — fix Closes-AC trailers or push with --no-verify"
  exit 1
fi
echo "[framework] pre-push: /vskit:check deploy"
if ! /vskit:check deploy; then
  echo "[framework] check deploy failed — re-score or fix gates, or push with --no-verify"
  exit 1
fi
# <<< framework v1.6 END
```

**Failure semantics.** Both commands print their own failure detail; the hook adds one line of context naming the bypass mechanism. Per INV-3, a bypass via `--no-verify` is not silently logged anywhere by git itself — that is git's behavior, not the framework's. A repo that wants `--no-verify` audited must wire its own server-side check (deferred to v1.7 with the CI/CD integration bundle).

### 5.3 Overhead Measurement (operationalizes INV-5)

**Budget.** Default 100 000 tokens/week per actively-developed repo. Overridable in the repo's `CLAUDE.md` via:

```markdown
## Framework Overhead
**Weekly token budget:** 50000
```

**`/vskit:report-overhead` command.** Aggregates today's worklog plus the last six dailies under `docs/worklog/` and reports:

```
Repo: <name>
Window: YYYY-MM-DD → YYYY-MM-DD (last 7 days)
Tokens: ~123k / 100k budget   [BREACH]
Wallclock: 4h 12m
Top commands: /vskit:score-all (45k), /vskit:review prd (28k), /implement (22k)
Status: BREACH (week 1 of 2 — next breach triggers §5.3 exit procedure)
```

**Breach detection.** `/vskit:report-overhead` re-evaluates the budget on every invocation. It also runs unattended once per week if the host scheduler (cron, systemd timer, or the framework's own scheduling skill) is configured to invoke it — the framework spec does not own scheduler configuration, but a repo that never runs `/vskit:report-overhead` cannot detect breaches. Two consecutive weekly breaches → mandatory exit procedure (next subsection). Per INV-3, a single command exceeding 50% of the weekly budget prints a `**[OVERHEAD WARN]**` line in the worklog and to stderr.

**Worklog archival.** As a side effect of each run, `/vskit:report-overhead` moves any `docs/worklog/YYYY-MM-DD.md` whose date is older than 90 days into `docs/worklog/_archive/YYYY-MM.md`, concatenating by month with a `## YYYY-MM-DD` separator per day. The 7-day computation window and current dailies are untouched. Archived files remain in git history; no data loss. A repo that never runs `/vskit:report-overhead` never archives — the only consequence is a growing `docs/worklog/` directory, which is the same fail-loud signal as a missed breach.

**Exit procedure (mandatory after two consecutive breaches).** The repo MUST either:
1. **Reduce scope** — drop optional artifacts (set `Applies: []` and remove DBSCHEMA/INTERFACE-CONTRACTS/prototypes per §4.2.1), reduce `/vskit:score-all` cadence to monthly, skip `/vskit:review prd` for revisions, OR
2. **Drop the framework** — remove `.claude/settings.json` Stop hook, delete `docs/features/`, retain only `docs/PRD.md` and `docs/incidents/`. A row is appended to the host's portfolio registry (`<portfolio-registry>/PORTFOLIO.md`, declared in the host CLAUDE.md) recording the drop date and reason.

Silent over-budget operation is a Rule 12 violation. The framework MUST report when it is failing its own headline goal (§0.1 items 3–4).

---

## 6. Prototype Exposure System

### 6.1 When Required

A feature with `**Prototype: required**` in its SPEC.md must reach `**Prototype: approved**` before moving from `Spec Ready` to `In Development`. The UX specialist sets the field during `/vskit:critique spec`. Backend-only features are automatically `N/A`.

### 6.2 Folder Structure

```
docs/
├── prototypes/
│   └── index.html                      # Auto-generated listing (via /vskit:gen-prototype-index)
└── features/
    └── <feature-slug>/
        └── prototypes/
            ├── index.html
            └── assets/
```

### 6.3 Reverse-Proxy Configuration (reference example)

The framework requires only: (a) the prototype index is served behind basic-auth at `/prototypes/`, (b) credentials are stored in the host's secrets store — never committed to the repo. The implementation below is one valid wiring; any equivalent setup satisfies the requirement.

```nginx
location /prototypes/ {
    alias <repo-root>/docs/prototypes/;
    auth_basic "Prototypes — <AppName>";
    auth_basic_user_file <proxy-secrets-dir>/htpasswd/<app>-prototypes;
    autoindex on;
    try_files $uri $uri/ /prototypes/index.html;
}
```

```bash
htpasswd -c <proxy-secrets-dir>/htpasswd/<app>-prototypes <username>
```

Credentials stored in the host's secrets store as `PROTOTYPES_USER` and `PROTOTYPES_PASS`. Never commit them to the repo (Rule 12: fail loud beats silent leak).

---

## 7. Scoring System

### 7.1 How Scoring Works

`/vskit:score feature <slug>` launches **up to 8 parallel subagents**, one per dimension. Each reads the feature folder independently and scores 0–10. Results are merged into SCORE.md. Always full re-score — no incremental caching. Regressions must surface.

**Applies-aware scoring (per §4.2.1 and INV-4).** A dimension is only scored when its prerequisite is declared. Dimensions that do not apply are written as `N/A — <reason>` in SCORE.md and **excluded from the composite mean** (denominator shrinks accordingly). Scoring an absent surface against a 0 floor would punish features for honest scope.

| Dimension | Scored only when |
|-----------|------------------|
| 1 Documentation | always |
| 2 Test Coverage | always (a feature with zero tests scores low; that is honest, not unfair) |
| 3 Module Clarity | always |
| 4 Requirements Coverage | always |
| 5 Logging | feature ships runtime code (i.e., has ≥1 task implemented in `server/` or `client/`) |
| 6 Error Handling | feature ships runtime code |
| 7 Security | **always** (since v1.7 — see note below) |
| 8 NFR Compliance | SPEC.md §4 has ≥1 measurable row (rows of `N/A — <reason>` do not count) |

**Security is always scored (v1.7 change).** v1.6 allowed Security to be `N/A` when no `interface-contracts` and no `dbschema` were declared. That exemption was wrong: even a pure CLI library has supply-chain attack surface (dependency provenance), log-leak risk (secrets in stack traces), and input-trust boundaries (user-controlled args reaching subprocesses). The v1.7 Dim 7 rubric (§7.2) names what to look for in non-HTTP/non-DB features so the score is meaningful, not vacuous.

Ship gate floors apply to every scored dimension. A feature whose Logging or NFR is `N/A` cannot fail those floors — but Security has no opt-out and must clear the floor on every feature.

### 7.2 Scoring Dimensions & Rubric

**Per-integer disambiguation (applies to every dimension below).** The four-row tables describe bands; the gates (§10.3) split inside bands at 7, 8, 9, 10. Within each band, scorers split by this rule:

| Integer | Meaning |
|---------|---------|
| 10 | All band criteria met + exceptional on stretch criteria (e.g., novel approach, reusable beyond this feature) |
| 9 | All band criteria met, zero defects |
| 8 | All band criteria met, ≤1 minor defect (cosmetic, isolated, low blast radius) |
| 7 | All band criteria met, ≤2 minor defects (gate floor for non-security) |
| 5–6 | 1 gate criterion not met (cannot ship without waiver) |
| 0–4 | Critical fail (≥2 gate criteria not met or category broken — hard block) |

Two scorers with the same evidence should land on the same integer using this rule. If they don't, the rubric is the bug — file a `/vskit:critique spec` revision.

#### Dimension 1 — Documentation (owner: prompt-engineer)

Evaluates SPEC.md completeness, cross-reference quality, **and DECISIONS.md propagation integrity** (§4.5 propagation contract). A decision row whose `Updates` column is empty and that does not appear in `## Deferred Items` is a defect: the decision was made but never landed in the canonical file. Per INV-1, that creates two sources of truth or none.

| Score | Criteria |
|-------|----------|
| 9–10 | All 10 SPEC sections present, non-vague, ACs independently verifiable, all cross-refs resolve, Open Questions all resolved, every DECISIONS row has a non-empty `Updates` or is in `## Deferred Items` |
| 7–8 | All sections present, 1–2 vague ACs, Open Questions tracked but some unresolved, ≤1 orphan DECISIONS row |
| 5–6 | Missing 1–2 sections, majority of ACs not verifiable, OR ≥2 orphan DECISIONS rows |
| 0–4 | Stub or skeletal spec; sections absent; DECISIONS not populated despite critique runs in worklog |

#### Dimension 2 — Test Coverage (owner: testing-lead)

Evaluates whether ACs have corresponding tests and whether edge cases are covered.

| Score | Criteria |
|-------|----------|
| 9–10 | Every AC has ≥1 test; happy path + key edge cases; Playwright covers all UI ACs; no `skip`/`xfail` without a dated removal condition |
| 7–8 | Every AC has a test; edge case coverage partial |
| 5–6 | >20% of ACs have no corresponding test |
| 0–4 | Fewer than half of ACs covered, or test suite does not run |

#### Dimension 3 — Module Clarity (owner: backend-lead; co-scorer: frontend-lead when feature touches client/)

Evaluates boundaries, coupling, and export surface. `/vskit:score` invokes `backend-lead` for this dimension; for features whose `Applies:` includes `ux` OR whose touched files include client-side code, `frontend-lead` is invoked as a second scorer and the **lower of the two scores** is recorded (per INV-3: surface the weakness, do not average it away). The SCORE.md `Notes` column records both raw scores when this happens.

| Score | Criteria |
|-------|----------|
| 9–10 | Clear single-responsibility boundary; no circular deps; exports only what callers need; no god objects |
| 7–8 | Minor coupling issues; one circular dep or one oversized module |
| 5–6 | Multiple circular deps or significant coupling to unrelated features |
| 0–4 | No discernible boundaries; feature code spread across unrelated modules |

#### Dimension 4 — Requirements Coverage (owner: product-owner)

Evaluates whether every PRD success metric and feature item is reflected in SPEC.md ACs. The PRD does not carry its own ACs — feature ACs live in each SPEC.md §3 — so this dimension maps **PRD §2 metrics + PRD §6 feature lines** to **SPEC §3 ACs**.

| Score | Criteria |
|-------|----------|
| 9–10 | Every PRD §2 metric and §6 feature line maps to ≥1 SPEC §3 AC; no PRD intent lost |
| 7–8 | ≤2 PRD §2/§6 items without a SPEC AC; intent preserved |
| 5–6 | 3–5 PRD §2/§6 items missing from SPEC |
| 0–4 | SPEC was written without reading the PRD; major gaps |

#### Dimension 5 — Logging (owner: devops-lead)

Evaluates structured logging quality and PII safety.

| Score | Criteria |
|-------|----------|
| 9–10 | Structured logs at every entry/exit/error; correlation IDs propagated; no PII in logs; log level appropriate per environment |
| 7–8 | Structured logs present; 1–2 missing on error paths; no PII |
| 5–6 | Console.log or unstructured logging; or PII present in logs |
| 0–4 | No logging or logging crashes silently |

#### Dimension 6 — Error Handling (owner: backend-lead)

Evaluates whether all error paths are named, return correct codes, and never fail silently.

| Score | Criteria |
|-------|----------|
| 9–10 | All error paths named; correct HTTP codes; user-facing messages defined; no unhandled promise rejections or uncaught exceptions |
| 7–8 | All paths handled; 1–2 codes incorrect or messages generic |
| 5–6 | Some paths swallow errors or return 500 for user errors |
| 0–4 | Significant silent failure surfaces; missing try/catch on I/O |

#### Dimension 7 — Security (owner: security-specialist)

Evaluates the feature's full attack surface. For HTTP/RPC features: auth, input validation, injection, rate limits. For DB features: schema-level constraints, query injection, PII handling. For CLI/library features: dependency provenance, secret-in-log risk, user-arg → subprocess trust boundary, file-write path validation. Per §7.1, Security is **always** scored — there is no surface-less feature.

| Score | Criteria |
|-------|----------|
| 9–10 | All applicable categories covered: auth/validation/rate-limit on HTTP surfaces; sanitized queries + indexed PII on DB; pinned deps + scrubbed logs + bounded subprocess on CLI/lib; secrets never logged anywhere |
| 7–8 | Primary surface protected; one secondary category missing (e.g. rate limiting untested, or deps unpinned) |
| 5–6 | One unprotected route, one unvalidated input path, one secret-leak risk, or unpinned deps in a published library |
| 0–4 | Auth missing on protected routes, raw user input reaches DB/shell, secrets in logs, or no dependency review on a library that imports third-party code |

#### Dimension 8 — NFR Compliance (owner: perf-specialist)

Evaluates whether the implementation meets the latency, error budget, and quota requirements in SPEC.md §4.

| Score | Criteria |
|-------|----------|
| 9–10 | p95 latency within budget (verified by test or load data); error budget within threshold; all quotas enforced in code |
| 7–8 | Quotas enforced; latency budget not yet measured but architecture supports it |
| 5–6 | Quotas not enforced, or known latency violation with no mitigation |
| 0–4 | §4 NFRs not implemented or not measurable |

### 7.3 SCORE.md Template

```markdown
# Score — <Feature Name>
**Feature:** <slug>
**Last scored:** YYYY-MM-DD
**last_scored_sha:** <git rev-parse HEAD at scoring time>  *(populated by /score; freshness gate in §10.3)*

## Scores

| Dimension | Score | Scorer | Notes |
|-----------|-------|--------|-------|
| Documentation | 0 | prompt-engineer | |
| Test Coverage | 0 | testing-lead | |
| Module Clarity | 0 | backend-lead (+ frontend-lead if ux/client/) | |
| Requirements Coverage | 0 | product-owner | |
| Logging | 0 | devops-lead | |
| Error Handling | 0 | backend-lead | |
| Security | 0 | security-specialist | |
| NFR Compliance | 0 | perf-specialist | |

**Composite:** 0.0 / 10
**Composite formula:** arithmetic mean of the **scored** dimensions (any dimension marked `N/A` per §7.1 is excluded from both numerator and denominator; Security is never N/A as of v1.7), rounded to 1 decimal place. The "no scored dimension < 7" floor and "security ≥ 8" rule are evaluated **independently** of the composite — a high mean cannot mask a weak dimension.
**Ship gate:** every scored dimension ≥ 7 · composite ≥ 8.0 · security ≥ 8 (see §10.3 for hard-block vs soft-block tiers)

## Drift Findings
[Populated by /vskit:score feature when code diverges from SPEC §3 ACs.
Format: `AC-<N>: <file>:<line> — <description>`]

## Score History

| Date | Composite | Trigger | Notes |
|------|-----------|---------|-------|

> Appended by `/vskit:score feature`. Per INV-1, consecutive identical rows (same Composite AND same Trigger) collapse: the most recent row's Date column becomes the range `<first>..<last>` instead of duplicating. A `/vskit:score` run that produces a [cached] result (§8.2) does NOT append a row — the prior row's range extends instead.

## Improvement Actions

- [ ] ACTION-01: [Dimension] — [What to fix] — Owner: [agent]
```

---

## 8. Command Library

All commands are target-aware. Commands that operate on a specific feature or PRD take a slug or path argument. Commands that read live state print to terminal only — they write no files.

### 8.1 PRD Commands

| Command | Description | Output |
|---------|-------------|--------|
| `/vskit:review prd <prd-path>` | 11 parallel subagents score and critique the PRD independently. Iterate until all scores ≥ 9. Appends one row per round to PRD `## Score History`. | Updated PRD §Round-Table Scores + Score History |
| `/vskit:critique prd <prd-path>` | *(renamed from `/grill-me prd` in v1.6.)* Specialists interrogate the PRD for weak evidence, missing sections, and vague metrics. | Annotated PRD with inline questions; §13 Open Questions updated |
| `/vskit:prd-to-features <prd-path>` | Extract feature list from PRD, create `docs/features/<slug>/` stub folders for each. | Feature folders with stub SPEC.md, TASKS.md, DBSCHEMA.md, INTERFACE-CONTRACTS.md, SCORE.md, DECISIONS.md |

### 8.2 Feature Commands

| Command | Description | Output |
|---------|-------------|--------|
| `/vskit:critique spec <slug>` | *(renamed from `/grill-me feature` in v1.6 to avoid collision with the host's user-facing `grill-me` skill.)* Specialists interrogate SPEC.md for weak ACs, missing NFRs, edge cases. Sets `Prototype:` field. **For every decision reached, appends a row to DECISIONS.md AND propagates the change to the canonical file in the same run** (§4.5 propagation contract). Unresolved items become `DEF-NN` rows — never silently dropped (INV-3). | Updated DECISIONS.md (D-NN rows); updated SPEC.md §3/§4/§9 and/or DBSCHEMA.md / INTERFACE-CONTRACTS.md per propagation contract |
| `/vskit:spec-to-tasks feature <slug>` | Break SPEC.md ACs into TASKS.md implementation tasks with owner and priority. Reads DECISIONS.md; tasks whose existence is driven by a decision get the `Decision: D-NN` column populated. | Populated `TASKS.md` (with Decision column) |
| `/vskit:implement feature <slug>` | Implement all Pending tasks in TASKS.md per the SPEC. Commits carry `Closes-AC: <slug>#AC-NN` and (when applicable) `Decision: <slug>#D-NN` trailers. | Code changes; TASKS.md statuses updated |
| `/vskit:test feature <slug>` | Run tests scoped to this feature. Report failures. | Test output; SCORE.md §test-coverage updated |
| `/vskit:score feature <slug>` | Up to 8 parallel subagents evaluate scored dimensions (§7.1 Applies-aware). Dim 1 audits DECISIONS.md propagation. **Cache:** if `git diff <last_scored_sha>..HEAD -- docs/features/<slug>/ <SPEC Touches: paths>` produces no output, skip scoring and print `[cached] last_scored_sha=<sha> diff=clean` (exit 0). On miss, full re-score and update `last_scored_sha`. `--force` bypasses cache. | Updated `SCORE.md` (or `[cached]` line) |
| `/vskit:prototype feature <slug>` | UX specialist generates HTML prototype from SPEC.md §3 ACs. | `docs/features/<slug>/prototypes/index.html` |
| `/vskit:clause add <slug> "<rule>" [--severity=<low\|medium\|high\|critical>]` | Append a new `CLA-NN` row to `docs/features/<slug>/CLAUSES.md` (creates the file and adds `clauses` to `Applies:` if missing). Defaults severity to Medium. Runs `/vskit:clause check` for the new clause before exiting so a baseline verdict is recorded. | New CLAUSES row + baseline check result |
| `/vskit:clause remove <slug> <clause-id>` | Move the named clause from the active table to `## Removed / Superseded Clauses` with reason and final verdict. Confirmation required. Silent deletion forbidden (§4.7). | CLAUSES.md updated; audit row preserved |
| `/vskit:clause update <slug> <clause-id> "<new rule>" [--severity=<...>]` | Edit rule text or severity. Old row moves to Superseded with `Supersedes: CLA-NN`; new `CLA-NN+1` row inserted. Auto-runs `/vskit:clause check` so the new clause has a verdict. | CLAUSES.md updated with old + new rows; new check result |
| `/vskit:clause check <slug> [<clause-id>]` | Re-evaluate one (or all) active clauses against the current SPEC and code. Default scorer `security-specialist` (override per-clause via `Scorer:` field). Updates last-spec-check and last-code-check rows with verdict, confidence, top-5 files, reasoning. Exit non-zero if any High/Critical FAIL @ confidence ≥ 80%. | CLAUSES.md updated; ship-gate-relevant exit code |
| `/vskit:clause list <slug> [--status=<pass\|fail\|stale\|indeterminate>]` | Print all active clauses for a feature, optionally filtered. Read-only. | Terminal report |

| Command | Description | Output |
|---------|-------------|--------|
| `/vskit:score-all` | Run `/vskit:score feature` for every folder in `docs/features/`. | All SCORE.md files updated |
| `/vskit:audit spec` | Audit all SPEC.md files for: (a) §4.3 section completeness, (b) `Touches:` correctness — warns when a declared pathspec resolves to no files OR when `git log --name-only <last_scored_sha>..HEAD` shows commits with `Closes-AC: <slug>#…` trailers that touched files outside the feature's `Touches:` scope (stale pathspec → silent cache miss/false-clean), (c) §10.4 INC↔SPEC conflicts. Exit non-zero on any warning. | Gap report printed to terminal; non-zero exit on warnings |
| `/vskit:project-status` | Read all SPEC.md files; print feature states, priorities, composite scores, and blockers. | Terminal report — nothing written to disk |
| `/vskit:show-backlog` | Read all `docs/features/*/TASKS.md`; print aggregated task list filterable by status/owner/priority. | Terminal report — nothing written to disk |
| `/vskit:next-task` | Recommend the single highest-priority unblocked task across all features. | One-paragraph recommendation |
| `/vskit:next-task` | Recommend the next action based on current feature states and scores. | One-paragraph recommendation |
| `/vskit:open-questions` | Aggregate all unresolved §9 Open Questions from all feature SPECs. | Terminal report sorted by feature and owner |
| `/vskit:run-tests` | Full test suite (unit + integration + e2e). | Test report; SCORE.md §test-coverage updated for touched features |
| `/vskit:run-e2e` | End-to-end tests only. Screenshots on failure. | E2E report + screenshots in `docs/testing/e2e-<date>/` |
| `/vskit:check deploy` | Read-only ship-gate evaluation. Check every feature SCORE.md against §10.3. Print failing features + dimensions. Exit code 0 if all pass, 1 if any hard-block, 2 if soft-block-only. **Writes nothing.** | Terminal report + exit code |
| `/vskit:deploy` | Repo-specific deploy shell command (defined in CLAUDE.md §Commands). MUST call `/vskit:check deploy` first; refuses on hard-block; on soft-block prompts `"N features below ship gate. Deploy anyway? [y/N]"` and on `y` appends a waiver row to SCORE.md `## Score History` for each failing feature before running the shell command. | Confirmation prompt + deploy execution + waiver rows |
| `/vskit:deploy` | Alias: `/vskit:check deploy && /vskit:deploy`. Kept for ergonomics. | See above |
| `/vskit:health-check` | Hit health endpoints for the app and all service dependencies. | Status table in terminal |
| `/vskit:security-review` | security-specialist audits the full codebase. | Security report; incidents/ entry if findings |
| `/vskit:gen-prototype-index` | Regenerate `docs/prototypes/index.html` from all feature prototype folders. | Updated index file |
| `/vskit:report-overhead` | Aggregate last 7 days of worklog and report tokens, wallclock, top commands, breach status against the weekly budget (§5.3). Side effect: archives daily worklog files older than 90 days into `docs/worklog/_archive/YYYY-MM.md`. | Terminal report; archived dailies on disk |
| `/vskit:audit-traceability [<since-ref>]` | Scan `git log <since>..HEAD` for `Closes-AC:` trailers on every non-merge commit. Exit non-zero if any commit lacks one (unless `CLAUDE.md` declares `Traceability: aspirational` per §0.1). **Default `<since-ref>`:** `git describe --tags --abbrev=0` if any tag exists, else `git merge-base HEAD origin/main`. Honors both release-tagged and trunk-based workflows. | Terminal report; non-zero exit on missing trailers |
| `/vskit:clause check-all [--feature=<slug>]` | Run `/vskit:clause check` across every feature folder with `clauses` in Applies. Per-feature exit codes aggregated: non-zero if any feature reports High/Critical FAIL @ confidence ≥ 80%. | All CLAUSES.md files updated; aggregated exit code |
| `/vskit:clause audit` | Read-only scan of all CLAUSES.md files. Reports stale clauses (last code check > 14 days), failing clauses, and INDETERMINATE clauses. Sorted by severity then staleness. Exit non-zero if any High/Critical FAIL or stale High/Critical. **Writes nothing.** | Terminal report + exit code |
| `/vskit:init-framework` | One-shot scaffolder for a new repo. Creates `docs/` tree (PRD.md stub, prds/, features/, worklog/, prototypes/, incidents/, process/, technical/, bundles/), writes `CLAUDE.md` §Commands stub, installs the Stop hook to `.claude/settings.json` (with the worklog-stop-hook.sh script embedded as a heredoc), then prompts: `Install pre-push hook that runs /vskit:audit-traceability and /vskit:check deploy? [Y/n]`. Idempotent — re-running tops up missing pieces without overwriting existing content. | Created files; one prompt; updated `.claude/settings.json` |
| `/vskit:init-prototypes` | Conditional sub-init. Run when a feature adds `prototype` to `Applies:`. Creates `docs/prototypes/index.html` skeleton, prompts for the `<app-name>` slug and basic-auth username, generates the htpasswd file at `<proxy-secrets-dir>/htpasswd/<app>-prototypes`, writes the reference §6.3 reverse-proxy block to stdout for the operator to paste into the proxy config. | htpasswd file; printed proxy config |

### 8.4 Orchestration Commands

Orchestration commands chain the atomic commands above into single-invocation workflows. Each step is the canonical command — orchestrators never reimplement step logic. **Halt rules:** if any step exits non-zero, the orchestrator stops, prints the failing step + its output, and exits with the same code. State already written to disk (DECISIONS rows, TASKS rows, partial commits) is preserved; the next run resumes from the current observable state, not from scratch.

| Command | Chained steps | Halts when |
|---------|---------------|------------|
| `/vskit:ship feature <slug>` | `/vskit:critique spec` → `/vskit:spec-to-tasks feature` → `/vskit:implement feature` → `/vskit:test feature` → `/vskit:score feature` → `/vskit:prototype feature` *(only if `prototype` in Applies)* | spec-grill leaves orphan DECISIONS rows; implement leaves a TASKS row not `Done`; test fails; score yields any scored dimension < 7 or security < 8 |
| `/vskit:run-pipeline prd <prd-path>` | `/vskit:review prd` (iterate until all ≥ 9, max 5 rounds) → `/vskit:critique prd` → `/vskit:prd-to-features` → for each created feature folder: `/vskit:ship feature <slug>` | round-table fails to reach all ≥ 9 within 5 rounds; any `/vskit:ship feature` halts |
| `/vskit:ship feature <slug>` | `/vskit:test feature` → `/vskit:score feature` (cache rule per §8.2) → `/vskit:check deploy` → `/vskit:deploy` *(prompts on soft-block per §10.3)* | hard-block at deploy-check; user declines soft-block prompt |
| `/vskit:ship-all` | for each feature in `Spec Ready` or `Testing`: `/vskit:ship feature <slug>` | first feature that halts |

**Resumability.** Because every step's progress is observable on disk (TASKS row statuses, DECISIONS rows, SCORE history, `last_scored_sha`), `/vskit:ship feature` is idempotent: re-running after a halt skips already-completed steps. A step is "complete" when its canonical output exists and is current — for `/vskit:score`, "current" means `git diff <last_scored_sha>..HEAD -- <feature scope>` is empty (the cache rule from §8.2).

**Worklog footprint.** Each chained step writes its own worklog row via the Stop hook — the orchestrator does not write an additional summary row. To see the full chain, filter worklog by orchestration session (same `session_id`).

---

## 9. CLAUDE.md Integration

Each repo's `CLAUDE.md` must include a **Commands** section. Repo-specific overrides bind the framework's command names to shell invocations valid for that repo's stack and host. **Critical:** `/vskit:deploy` is the only overridable deploy verb — `/vskit:check deploy` is owned by the framework and MUST NOT be overridden. The combined `/vskit:deploy` alias always runs `/vskit:check deploy` first; a repo override that bypasses it violates §10.3 and is forbidden.

```markdown
## Commands

Framework: <path-to-this-spec>

### Repo-Specific Overrides

| Command | Shell invocation |
|---------|-----------------|
| `/vskit:run-tests` | `cd server && npm test && cd ../client && npm test` |
| `/vskit:run-e2e` | `BASE_URL=http://localhost:3000 npx playwright test` |
| `/vskit:health-check` | `curl -sf http://localhost:3000/health` |
| `/vskit:deploy` | `cd <repo-root> && git pull && <repo deploy command, e.g. docker compose up -d --build>` |

### Framework settings (optional)

- `Traceability: aspirational`   — exempt the repo from `/vskit:audit-traceability` per §0.1
- `Weekly token budget: <N>`     — override the §5.3 default of 100 000
```

A repo MUST NOT redefine `/vskit:check deploy`, `/vskit:score`, `/vskit:critique spec`, `/vskit:critique prd`, `/vskit:audit-traceability`, `/vskit:init-framework`, or any other framework-owned command. Doing so silently changes ship-gate semantics and breaks cross-repo expectations.

---

## 10. Quality Gates

### 10.1 PRD Promotion Gate
- All 11 specialist scores ≥ 9
- All §13 Open Questions resolved or deferred with documented rationale
- §3.1 customer evidence present (≥ 3 signals)

### 10.2 Feature Implementation Gate

`/vskit:implement feature <slug>` (and the equivalent step inside `/vskit:ship feature`) refuses to start unless ALL of the following hold. Per INV-2, lifecycle state itself is computed from observable signals (§4.1) — this gate is the precondition the `/vskit:implement` command checks before moving any TASKS row off `Pending`.

- SPEC.md Documentation score ≥ 7 (i.e., feature is in `Spec Ready`)
- DBSCHEMA.md has content for every table the feature touches *(only if `dbschema` in Applies)*
- INTERFACE-CONTRACTS.md has content for every endpoint added/modified *(only if `interface-contracts` in Applies)*
- TASKS.md is populated (≥ 1 Pending task)
- DECISIONS.md has no orphan rows (every row has a non-empty `Updates` OR is in `## Deferred Items`)
- `Prototype: approved` if feature was tagged `Prototype: required` (N/A when `prototype` not in Applies)

### 10.3 Feature Ship Gate

The gate has two tiers:

**Hard block** (`/vskit:check deploy` exits non-zero; `/vskit:deploy` refuses; no override):
- Security dimension < 8 (Security is always scored since v1.7 — §7.1)
- Any TASKS.md entry not `Done`
- SCORE.md `last_scored_sha` is missing or empty (never scored), OR `git diff <last_scored_sha>..HEAD -- <feature scope>` is non-empty (stale — run `/vskit:score feature <slug>`). The per-feature scope is `docs/features/<slug>/` plus the SPEC `Touches:` pathspec (§8.2 cache rule).
- DECISIONS.md contains a row whose `Updates` is empty and which is not in `## Deferred Items` (per §4.5; an unpropagated decision means the SPEC and code disagree)
- SPEC §8 lists a `Blocked-by:` slug whose feature is not in `Shipped` state (per §4.1; blocker cannot ship downstream until upstream is live)
- **(v1.8)** Any active clause (§4.7) with severity `High` or `Critical`, verdict `FAIL`, confidence ≥ 80% — against either spec OR code check.

**Soft block with logged waiver** (`/vskit:deploy` prompts; deployment proceeds only after a written waiver):
- Composite < 8.0
- Any scored non-security dimension < 7
- E2E does not cover all happy-path ACs
- **(v1.8)** Any active clause with severity `High` or `Critical`, verdict `FAIL`, confidence 60–79% (interpretive zone — surface, don't block hard).
- **(v1.8)** Any active clause with severity `Medium`, verdict `FAIL`, confidence ≥ 80%.
- **(v1.8)** Any active clause with severity `Medium` or higher, **stale** (last code check > 14 days). Run `/vskit:clause check <slug>` to clear.

Low-severity FAIL clauses are listed in the `/vskit:check deploy` report but do not gate. Critical FAIL clauses where the scorer returns INDETERMINATE (confidence < 60%) escalate to a soft block — per INV-3, ambiguous answers don't get to pass as "clear."

When the user accepts a soft-block waiver, `/vskit:deploy` appends a row to SCORE.md `## Score History` capturing: date, deployer, failing dimension(s), composite at deploy time, and free-text waiver reason. Waivers are auditable; silent overrides are not possible.

The `/vskit:check deploy` + `/vskit:deploy` pair enforces hard rules unconditionally and surfaces soft rules with a permanent paper trail — bypass is recorded, never invisible.

### 10.4 INC ↔ SPEC Conflict Resolution

When an Incident report (`docs/incidents/INC-NNN.md`) contradicts a SPEC.md — claiming behavior that the SPEC says is not supported, or naming a constraint the SPEC omits — the **SPEC update PR is filed first** and the INC closes only after the SPEC PR merges. The INC links to the SPEC PR in its Fix Evidence section.

Why: an open INC pointing at an unchanged SPEC creates two sources of truth (violates INV-1) and silently encodes "current behavior is wrong but we shipped it anyway." If the INC's claim is the new truth, the SPEC must change; if the SPEC is right, the INC must be reframed as a regression instead of a contradiction.

**Enforcement:** an INC with `status: resolved` whose body asserts a SPEC contradiction without linking to the SPEC PR that resolved it is a Dim 1 (Documentation) defect. `/vskit:audit spec` flags it.

---

## 11. Adoption Checklist (per repo)

```markdown
## Framework Adoption — <Repo Name>

### Doc Tree
- [ ] docs/features/<slug>/ exists for every feature (SPEC, TASKS, SCORE mandatory; DBSCHEMA / INTERFACE-CONTRACTS / prototypes only if in SPEC `Applies:` per §4.2.1)
- [ ] docs/worklog/ folder created
- [ ] docs/prototypes/ folder + index.html created (if any feature has prototype in Applies)
- [ ] Legacy folders **archived then removed** (do NOT delete in place): move `docs/sprint/`, `docs/project/`, `docs/board-history/`, `docs/drift-reports/`, `docs/bugs/`, `docs/code-reviews/`, `docs/FAQ.md`, `docs/FAQ-INDEX.md`, `tasks/BACKLOG.md` to `docs/_archive/<YYYY-MM-DD>-pre-framework/` first, then delete the originals. Commit the archive move as a separate commit so it is recoverable from `git log`.

### Spec Quality
- [ ] All SPEC.md files updated to §4.3 canonical template (Sprint field removed, Priority + Prototype fields added)
- [ ] SCORE.md initialized for every feature (all dimensions at 0)
- [ ] /vskit:score-all run; composite scores visible via /vskit:project-status

### Commands
- [ ] CLAUDE.md §Commands section added with repo-specific shell overrides
- [ ] Stop hook configured to auto-write worklog entries
- [ ] /vskit:run-tests, /vskit:run-e2e, /vskit:deploy shell commands verified

### Prototypes (deployed apps only)
- [ ] Reverse proxy `/prototypes/` block configured (see §6.3)
- [ ] htpasswd file created at `<proxy-secrets-dir>/htpasswd/<app>-prototypes`
- [ ] `PROTOTYPES_USER` and `PROTOTYPES_PASS` stored in host secrets store (never committed)
```

---

## 12. Spec Authority

This spec is normative. No external repo, snapshot, or prior version overrides it. When this spec disagrees with anything else — a running implementation, an older draft, a teammate's recollection — **this spec wins**. Update the divergent artifact to match the spec, not the other way around.

Drift between the spec and an adopting repo is filed as an incident under `docs/incidents/` in that repo and resolved by updating the repo to conform.
