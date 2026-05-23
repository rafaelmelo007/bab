# vertical-slices-md-dev-kit

**Your AI writes code that drifts from the spec. This makes the drift impossible to merge.**

A markdown-based quality gate for AI-assisted repos: every commit traces back to an acceptance criterion, every decision lands in a rationale journal, and the repo refuses to ship when the chain breaks. PRDs, per-feature SPECs (vertical slices), contract clauses, and a ship gate — all files, no SaaS.

> **Bundle version:** 2.0 · **License:** MIT · **Status:** Active
>
> **v2.0 changes:** All commands renamed to verb-first form and prefixed `vskit:` to avoid skill collisions. Twelve commands renamed, three deleted. See [`CHANGELOG.md`](./CHANGELOG.md) for the full old→new migration table.
>
> **v1.8 highlight (still active):** Clauses — invariant rules graded by AI with confidence + reasoning, per feature. See [§4.7 in the spec](./vertical-slices-ai-framework.md#47-clauses--invariant-rules-with-confidence-graded-checks) or the demo at [`example/features/demo-counter/CLAUSES.md`](./example/features/demo-counter/CLAUSES.md).

---

## Who this is for

You're a **solo dev or staff engineer** running an AI-assisted greenfield repo (or a small one). You ship a lot of code that Claude / Codex / Cursor / Aider helped write. You can feel that the spec lives in your head and the AI's output drifts from it slowly. You want guardrails that *don't* require a 10-person process team to maintain.

This bundle gives you four things that `git` + `make` + `pytest` do not:

1. **Intent declared before code.** Every commit names which PRD/SPEC acceptance criterion it satisfies.
2. **Quality measured per change, not per release.** Up to 8 named dimensions scored 0–10. Refuses to ship below floor.
3. **Overhead measured per repo.** The bundle records its own cost and forces a drop decision when it stops paying for itself.
4. **Decisions traceable from rationale to commit.** DECISIONS.md → SPEC.md → TASKS.md → commit trailer → audit. Every merged line walks back to the question that motivated it.

The full case is in [`vertical-slices-ai-framework.md`](./vertical-slices-ai-framework.md) §0.1.

The methodology itself is documented in [`vertical-slices-ai-framework.md`](./vertical-slices-ai-framework.md) (v2.0) — the normative spec. This bundle wraps that spec with templates, reference scripts, and a worked example so a stranger can adopt it without reading 1027 lines first.

---

## Getting started

### Install

**The kit is markdown + a few shell scripts.** No installer to run, no package to publish. Drop it into your repo via your AI assistant or via `degit`.

#### Recommended: clone the kit, ask your AI to apply it

```bash
# Clone once, anywhere on disk
git clone https://github.com/rafaelmelo007/vertical-slices-md-dev-kit.git ~/vskit
```

Then in your target repo, with Claude Code (or Cursor / Aider / any AI assistant with file access) open, paste this prompt:

> Apply the vertical-slices-md-dev-kit bundle from `~/vskit` to this repo, following its `ADOPTION.md` guide. Stop and ask before any destructive change.

Your AI will: copy the bundle into `docs/bundle/`, install the Stop hook into `.claude/settings.json`, scaffold the `docs/` tree, paste the snippet into `CLAUDE.md`, and pause if anything in your repo would be overwritten. Total time: ~1 minute.

#### Alternative: copy without AI (`degit`)

```bash
npx degit rafaelmelo007/vertical-slices-md-dev-kit docs/bundle
```

Then follow `docs/bundle/ADOPTION.md` for the Stop hook + doc tree + CLAUDE.md steps (~5 minutes of mechanical work).

Full walkthrough → [`ADOPTION.md`](./ADOPTION.md)

<details>
<summary><strong>Other ways to vendor the kit</strong></summary>

```bash
# git submodule (preserves upstream history; pulls updates with `git submodule update`)
git submodule add https://github.com/rafaelmelo007/vertical-slices-md-dev-kit.git docs/bundle

# shallow clone + copy (snapshot-in-time; no upstream tracking)
git clone --depth 1 https://github.com/rafaelmelo007/vertical-slices-md-dev-kit.git /tmp/vskit \
  && cp -r /tmp/vskit/. docs/bundle/ \
  && rm -rf docs/bundle/.git
```

</details>

### Commands — what they do and what they write

> Full simulated end-to-end run with every command's terminal output → [`WALKTHROUGH.md`](./WALKTHROUGH.md)

Every command is target-aware (`<slug>`, `<prd-path>`) and writes specific artifacts. The whole vocabulary in nine phase tables, then four inline walkthroughs for the commands that drive 80% of daily flow.

#### Setup

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:init-framework` | Scaffold doc tree, install Stop hook, write CLAUDE.md stub, install pre-push hook | yes — full `docs/` + `.claude/` + hooks |
| `/vskit:init-prototypes` | Sub-init when a feature adds `prototype` to Applies (creates htpasswd + nginx snippet) | yes — htpasswd |

#### PRD phase

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:review prd <prd-path>` | Round-table: 11 specialists score 0–10 in parallel until all ≥ 9 | yes — PRD score rows |
| `/vskit:critique prd <prd-path>` | Specialists interrogate; adds inline `> Q:` questions | yes — PRD annotations + §13 |
| `/vskit:prd-to-features <prd-path>` | Extract §6 features and scaffold `docs/features/<slug>/` | yes — feature stubs |

#### Per-feature spec → ship

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:critique spec <slug>` | Interrogate SPEC; **propagates each decision to its canonical file in the same run** | yes — SPEC + DBSCHEMA + INTERFACE-CONTRACTS + DECISIONS |
| `/vskit:spec-to-tasks feature <slug>` | Break ACs into TASKS rows; tag decision-driven ones | yes — TASKS rows |
| `/vskit:implement feature <slug>` | Write code; commits carry `Closes-AC:` + `Decision:` trailers | yes — source + commits |
| `/vskit:test feature <slug>` | Run tests scoped to feature's `Touches:` pathspec | yes — SCORE test-coverage notes |
| `/vskit:score feature <slug>` | 8 parallel scorers across 8 quality dimensions (cached) | yes — full SCORE.md update |
| `/vskit:prototype feature <slug>` | UX prototype HTML from SPEC §3 ACs | yes — `prototypes/` |
| `/vskit:ship feature <slug>` | Orchestrator: test → score → check deploy → deploy | yes — score history row |

#### Clauses (invariant rules, v1.8+)

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:clause add <slug> "<rule>" --severity=<...>` | Append new clause + auto-baseline check | yes — CLAUSES.md row |
| `/vskit:clause check <slug> [<id>]` | Re-evaluate clauses against current SPEC + code | yes — verdicts, confidence, top-5 files |
| `/vskit:clause list <slug>` | List active clauses, filterable by status | no |
| `/vskit:clause update <slug> <id> "<rule>"` | Edit rule/severity; supersedes the old row | yes |
| `/vskit:clause remove <slug> <id>` | Move to Removed/Superseded with reason + final verdict | yes |
| `/vskit:clause check-all` | Run check across every feature with `clauses` in Applies | yes |
| `/vskit:clause audit` | Read-only scan for stale + failing clauses across all features | no |

#### Status & navigation (read-only)

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:project-status` | Feature states, scores, blockers across the whole repo | no |
| `/vskit:show-backlog` | Aggregated open tasks, filterable by status/owner/priority | no |
| `/vskit:next-task` | Single highest-priority unblocked task | no |
| `/vskit:open-questions` | Aggregate unresolved §9 questions from all SPECs | no |

#### Audits & quality

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:audit-traceability` | Scan `git log` for `Closes-AC:` trailers on every non-merge commit | no |
| `/vskit:audit spec [<slug>]` | SPEC §4.3 completeness + `Touches:` correctness + INC↔SPEC conflicts | no |
| `/vskit:security-review` | security-specialist audits the full codebase | yes — `incidents/` on findings |
| `/vskit:report-overhead` | Last 7 days of worklog: tokens, wallclock, top commands, budget check | side-effect — archives 90+ day worklogs |

#### Tests & health

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:run-tests` | Repo-specific full suite | yes — SCORE notes |
| `/vskit:run-e2e` | E2E tests only; screenshots on failure | yes — screenshots |
| `/vskit:health-check` | Hit health endpoints for app + dependencies | no |

#### Ship

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:check deploy` | Read-only ship-gate evaluation across every feature | no |
| `/vskit:deploy` | Repo-specific deploy command (always runs `/vskit:check deploy` first) | yes — waiver row if soft-block |
| `/vskit:ship-all` | For each feature in Spec Ready or Testing: `/vskit:ship` | yes |
| `/vskit:run-pipeline prd <prd-path>` | Full end-to-end orchestrator: round-table → critique → features → ship | yes |

#### Utility

| Command | Purpose | Writes? |
|---|---|---|
| `/vskit:score-all` | `/vskit:score feature` for every feature (honors cache) | yes when not cached |
| `/vskit:gen-prototype-index` | Regenerate `docs/prototypes/index.html` from feature folders | yes |

---

### Four exemplary walkthroughs

The four commands that drive 80% of the daily flow, shown with full output. The rest follow the same shape — see [`WALKTHROUGH.md`](./WALKTHROUGH.md) for every command exercised end-to-end on one feature.

#### `/vskit:init-framework` — the only command you run once

```
$ /vskit:init-framework
[init-framework] scaffolding vertical-slices-md-dev-kit v2.0 in /home/dev/clickcount
[init-framework] creating doc tree...
  ✓ docs/PRD.md (stub)
  ✓ docs/{prds,features,worklog,prototypes,incidents,process,technical}/
[init-framework] installing Stop hook → .claude/settings.json
Install pre-push hook that runs /vskit:audit-traceability and /vskit:check deploy? [Y/n] y
Done. Next step: write your first PRD draft at docs/prds/draft/<date>-<slug>.md
```

**Writes:** full `docs/` tree, `CLAUDE.md`, `.claude/settings.json`, `.claude/scripts/worklog-stop-hook.sh`, `.git/hooks/pre-push`, worklog row.

#### `/vskit:critique spec <slug>` — the decision-propagation contract in action

Each decision raised by a specialist appends a DECISIONS row AND updates the canonical file it changes, in the same run. Orphan decisions are forbidden — that's the propagation contract.

```
$ /vskit:critique spec demo-counter
[critique] reading docs/features/demo-counter/SPEC.md
[critique] Applies: [] — interrogating to set it
  → SPEC frontmatter updated: Applies: [dbschema, interface-contracts]
  → DBSCHEMA.md created; INTERFACE-CONTRACTS.md created

[critique] launching specialists
  security-specialist: "Rate-limit storage — in-memory or Redis?"
    → D-01: in-memory token bucket, per-instance
    Updates: SPEC §3 AC-04, §4 Quota row, §10 note 1 ✓
  security-specialist: "Max campaign-name length?"
    → D-02: 64 chars after Unicode NFC
    Updates: SPEC §3 AC-03, §9 Q-02; INTERFACE-CONTRACTS POST /click body ✓
  ...

5 decisions logged. 3 deferred items recorded (DEF-01..DEF-03).
[critique] propagation contract checked — ✓ no orphan rows
Documentation score now: 9. Spec ready for /vskit:spec-to-tasks.
```

**Writes:** Updates to `SPEC.md` (§3, §4, §9), `DBSCHEMA.md`, `INTERFACE-CONTRACTS.md`; appends `D-NN` and `DEF-NN` rows to `DECISIONS.md`.

#### `/vskit:score feature <slug>` — 8 dimensions + ship-gate logic

Eight scorers run in parallel. Each dimension has a named owner; the composite is the mean but the gate enforces *every dim ≥ 7* and *security ≥ 8* independently.

```
$ /vskit:score feature demo-counter
[score] cache miss (10 new commits in scope)
[score] launching 8 scorers in parallel

  Documentation        → prompt-engineer   ... 9
  Test Coverage        → testing-lead      ... 6  (TC-04 fail, TC-05 skip, AC-07 no test)
  Module Clarity       → backend-lead      ... 8
  Requirements Cov     → product-owner     ... 9
  Logging              → devops-lead       ... 5  (T-06 incomplete; AC-07 not met)
  Error Handling       → backend-lead      ... 8
  Security             → security-specialist ... 8
  NFR Compliance       → perf-specialist   ... 6  (latency not yet measured)

Composite: 7.4 / 10
Ship gate: SOFT BLOCK
  - composite 7.4 < 8.0
  - Logging 5 < 7 floor
  - Test Coverage 6 < 7 floor
  - NFR 6 < 7 floor
  (Security 8 ≥ 8 ✓)

Drift Findings:
  AC-07: server/click/handler.rs:42 — peer_addr in log line. Violates D-03.

last_scored_sha updated → b9e4d22
```

**Writes:** Full SCORE.md update (8 rows, composite, history row, drift findings, improvement actions); `last_scored_sha` field.

#### `/vskit:ship feature <slug>` — orchestrated ship

Chains test → score → check deploy → deploy. Halts on the first failure; partial progress is preserved on disk.

```
$ /vskit:ship feature demo-counter
[ship] step 1/4: /vskit:test feature demo-counter ... all passing ✓
[ship] step 2/4: /vskit:score feature demo-counter (cached) → 8.5/10 ✓
[ship] step 3/4: /vskit:check deploy ... exit 0 — proceeding
[ship] step 4/4: /vskit:deploy ... Compiling clickcount v0.1.0 ... ✓ deployed

Score history row appended (Trigger: deploy).
Feature lifecycle now: Shipped.
```

**Writes:** SCORE.md `## Score History` row; build artifacts via repo-specific deploy command.

### When commands write a waiver

`/vskit:deploy` (and the `/vskit:ship` orchestrator that calls it) is the only place a **logged waiver** can be created. On a soft-block:

```
2 features below ship gate (composite < 8 on demo-counter; e2e gap on signup).
Deploy anyway? [y/N]: y
Waiver reason: marketing demo deadline; signup e2e blocked on staging env
```

If accepted, `/vskit:deploy` appends a row to **each failing feature's `SCORE.md ## Score History`** with date, deployer, failing dimensions, composite at deploy, and reason. Bypasses are auditable. Silent bypasses are impossible — the pre-push hook calls `/vskit:check deploy` and exits non-zero on hard-block.

---

## Per-feature anatomy — and why it produces solid specs

Every adopted feature lives in `docs/features/<slug>/`. **The point of this format is not documentation discipline — it's a quality scaffold.** Each file enforces a specific property that makes the spec verifiable rather than aspirational. Skip ahead to a file's subsection to see what it captures, why the format is what it is, and a snippet from the [worked example](./example/features/demo-counter/).

### Quick reference

| File | Required when | What it captures |
|---|---|---|
| [`SPEC.md`](#specmd--the-contract-always) | always | Problem, scope, independently-verifiable ACs, NFRs, test spec, open questions |
| [`TASKS.md`](#tasksmd--broken-from-acs-always) | always | Implementation tasks linked to ACs and decisions |
| [`DECISIONS.md`](#decisionsmd--the-rationale-journal-always) | always | Every design decision: question, decision, rationale, what canonical file got updated |
| [`SCORE.md`](#scoremd--quantified-quality-across-8-dimensions-always) | always | 8 dimensions scored 0–10, composite, ship-gate status, drift, history |
| [`DBSCHEMA.md`](#dbschemamd--tables-and-migrations-when-applies-dbschema) | `Applies: dbschema` | Tables, indexes, migrations with Up + Down + back-compat assertion |
| [`INTERFACE-CONTRACTS.md`](#interface-contractsmd--http-ws-rpc-endpoints-when-applies-interface-contracts) | `Applies: interface-contracts` | Endpoint contracts: request shape, validation, responses, auth, rate limits, logging |
| [`CLAUSES.md`](#clausesmd--ai-graded-invariant-rules-when-applies-clauses) | `Applies: clauses` | Invariant rules graded PASS/FAIL/INDETERMINATE with confidence + reasoning |
| [`prototypes/`](#prototypes--ux-mockups-when-applies-prototype) | `Applies: prototype` | UX prototype HTML for stakeholder review before code |

Each has a copy-paste skeleton in [`templates/`](./templates/). The [worked example](./example/features/demo-counter/) ships every file populated.

---

### `SPEC.md` — the contract (always)

**What it captures.** Problem statement (§1), in/out scope (§2), independently-verifiable acceptance criteria (§3), NFRs (§4 — latency, error budget, auth, quotas, accessibility, security), test specification (§7), open questions (§9), implementation notes (§10).

- **ACs must be independently verifiable.** Documentation score (§7.2 Dim 1) drops for vague ACs like "user can log in." Only sharp ACs like `AC-04: POST /click enforces 60 req/min/IP; the 61st returns 429` clear the floor. The format *forces* sharpness.
- **`Applies:` is an honest scope declaration.** A backend-only feature declares `[dbschema, interface-contracts]`; a CLI library declares `[]`. The scorer only audits what's declared — no penalizing a CLI lib for missing HTTP contracts.
- **`Touches:` is the cache key.** `/vskit:score` uses it to decide what to re-score. Plus `Status` is *computed* from observable state (TASKS rows + score values + score history) — never hand-edited, so no one can fake "we're 80% done."

**Example excerpt** ([`example/features/demo-counter/SPEC.md`](./example/features/demo-counter/SPEC.md)):

```markdown
**Applies:** [dbschema, interface-contracts, clauses]
**Touches:** [`server/click/**`, `server/db/migrations/202*_clicks.sql`]

## §3 Acceptance Criteria
- [x] AC-01: `POST /click` with `campaign=spring_promo` increments the count
       for `spring_promo` by 1 and returns `204 No Content`.
- [x] AC-04: `POST /click` enforces a per-IP rate limit of 60 requests/minute.
       The 61st request returns `429 Too Many Requests`. *(see DECISIONS D-01)*
- [ ] AC-07: All AC behavior is logged structured-JSON with a `campaign` field,
       never the client IP. *(see DECISIONS D-03)*
```

---

### `TASKS.md` — broken from ACs (always)

**What it captures.** Implementation tasks derived from SPEC §3 ACs. Columns: ID, description, owner, priority, status, linked ACs, source decision ID.

- **Every task has `Linked ACs`.** No work happens that doesn't trace to a requirement. The `/vskit:audit-traceability` command later refuses to merge commits that don't cite an AC.
- **`Decision: D-NN` column splits design-driven vs. baseline work.** A task that exists because of a /critique decision carries the decision ID. Tasks that just satisfy an AC have `—`. The split tells reviewers which work is opinion-shaped.
- **Status is the only hand-edited lifecycle signal.** Everything else is computed. The four valid states (`Pending → In Progress → In Review → Done`) are deliberate — fewer states means fewer lies.

**Example excerpt** ([`example/features/demo-counter/TASKS.md`](./example/features/demo-counter/TASKS.md)):

```markdown
| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-04 | Campaign-length cap at 64 chars + Unicode NFC | backend-lead | Medium | Done | AC-03 | D-02 |
| T-05 | Per-IP rate limiter (60/min token bucket)     | backend-lead | High   | Done | AC-04 | D-01 |
| T-08 | Unit + integration tests (TC-01..TC-04)       | testing-lead | High   | In Progress | AC-01..AC-06 | — |
```

---

### `DECISIONS.md` — the rationale journal (always)

**What it captures.** Every design decision: who raised it, the question, the decision, the rationale, which canonical file got updated (the propagation contract), any superseded prior decision. Unresolved items move to `## Deferred Items` (DEF-NN).

- **The propagation contract forbids orphan rows.** Every decision must cite the canonical file it caused to change (`SPEC §3 AC-04`, `DBSCHEMA users.deleted_at`, etc.). An orphan row is a Documentation defect — caught by `/vskit:score` Dim 1.
- **Unresolved decisions become `DEF-NN`, not silent drops.** Per INV-3 (fail loud): a decision that didn't land in a canonical file but won't be acted on right now still gets a row, with `Why deferred` and `Revisit when` filled.
- **History is append-only.** Superseded decisions get a `Supersedes: D-NN` link to the replacement; they don't disappear. Six months later, "why does this code check IP again?" answers itself: `git log --grep='Decision: D-04'` → DECISIONS.md D-04 → rationale + alternatives considered + who raised it.

**Example excerpt** ([`example/features/demo-counter/DECISIONS.md`](./example/features/demo-counter/DECISIONS.md)):

```markdown
| ID | Date | Raised by | Question | Decision | Rationale | Updates |
|----|------|-----------|----------|----------|-----------|---------|
| D-01 | 2026-05-19 | security-specialist | Rate-limit storage: in-memory or Redis? | In-memory token bucket, per-instance | Single-instance launch; Redis would add a dependency for a feature marketing may sunset in 6 months | SPEC.md §3 AC-04, §4 Quota row, §10 note 1 |
| D-05 | 2026-05-21 | product-owner | Auth required on POST /click? | No — public endpoint, rate-limit is the abuse control. | Auth would defeat the use case (recipients have no creds) | SPEC.md §4 Security row; INTERFACE-CONTRACTS.md POST /click auth |
```

---

### `SCORE.md` — quantified quality across 8 dimensions (always)

**What it captures.** 8 quality dimensions scored 0–10 (Documentation, Test Coverage, Module Clarity, Requirements Coverage, Logging, Error Handling, Security, NFR Compliance), composite, ship-gate status, drift findings, score history, improvement actions.

- **Eight INDEPENDENT scorers — no averaging away weakness.** The composite (mean) is informational; the ship gate enforces *every dim ≥ 7* and *security ≥ 8* separately. A Security 5 cannot hide behind a Documentation 9.
- **Each dimension has a named owner.** security-specialist scores Security, devops-lead scores Logging, etc. The Stop hook records which subagent ran. When a score drops, you know who to ask.
- **Drift Findings list code-vs-spec mismatches by file:line.** Six months later, the score file *is* the audit. The line number is right there. Score History shows the composite trajectory across sessions.

**Example excerpt** ([`example/features/demo-counter/SCORE.md`](./example/features/demo-counter/SCORE.md)):

```markdown
| Dimension | Score | Scorer | Notes |
|-----------|-------|--------|-------|
| Documentation | 9 | prompt-engineer | All sections present, all DECISIONS have Updates |
| Test Coverage | 6 | testing-lead | TC-04 in progress (T-08); AC-07 no test |
| Logging | 5 | devops-lead | T-06 In Progress — AC-07 not met |
| Security | 8 | security-specialist | Input validation OK; rate-limit per-instance only |

**Composite:** 7.4 / 10
**Ship gate:** SOFT BLOCK — Logging (5), Test Coverage (6), NFR (6) below 7 floor

## Drift Findings
- AC-07: `server/click/handler.rs:42` logs full request including `req.peer_addr()`.
  Violates D-03. Filed as part of T-06.
```

---

### `DBSCHEMA.md` — tables and migrations (when `Applies: dbschema`)

**What it captures.** Tables, columns, constraints, indexes, plus migrations (each with Up steps, Down/rollback steps, and a back-compat assertion).

- **Migrations force Up + Down + back-compat.** Three fields are mandatory; missing any is a Dim 7 (Security) defect because migration risk lives there. A one-way migration must explicitly justify the absence of a rollback — silent omission is forbidden.
- **Back-compat assertion is a paragraph, not a checkbox.** It names which old code paths continue to work between the Up and the corresponding code release. If no back-compat window is needed (coordinated single-deploy), the spec demands you say so explicitly with rationale.

**Example excerpt** ([`example/features/demo-counter/DBSCHEMA.md`](./example/features/demo-counter/DBSCHEMA.md)):

```markdown
### M-01 — 2026-05-20 — Create `clicks` table

**Up steps**
CREATE TABLE clicks (
  id          bigserial   PRIMARY KEY,
  campaign    text        NOT NULL CHECK (length(campaign) <= 64),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX clicks_campaign_idx ON clicks (campaign);

**Down steps (rollback)**
DROP INDEX IF EXISTS clicks_campaign_idx;
DROP TABLE IF EXISTS clicks;

**Back-compat assertion**
Additive new-table migration. No existing code reads or writes `clicks`
before this migration; no existing code becomes invalid after it.
No coordinated deploy window required.
```

---

### `INTERFACE-CONTRACTS.md` — HTTP / WS / RPC endpoints (when `Applies: interface-contracts`)

**What it captures.** Endpoint contracts: request shape (body, query, path params), validation rules, response codes and bodies, auth model, rate limits, logging contract.

- **Auth model declared explicitly per endpoint.** Public endpoints say "Auth: None — public endpoint by design (DECISIONS D-05)" — never silently assumed. If a security incident asks "why was this open?", the SPEC has the answer with the decision ID.
- **Validation rules trace to ACs and DECISIONS.** AC-03 says "campaign ≤ 64 chars." Decision D-02 says "NFC-normalize first." Both appear in the endpoint's validation section. The contract is the canonical place — code reviewers can grep for the rule before the type system catches it.
- **Logging contract is part of the endpoint, not an afterthought.** Every endpoint specifies what's logged (`campaign`, `status`, `duration_ms`) and what's NEVER logged (client IP, user-agent). Pairs with Dim 5 (Logging) scoring.

---

### `CLAUSES.md` — AI-graded invariant rules (when `Applies: clauses`)

**What it captures.** Invariant rules graded by AI: severity (Low/Medium/High/Critical), last spec check + last code check verdicts (PASS/FAIL/INDETERMINATE), confidence 0–100%, top-5 enforcement files, reasoning paragraphs, removed/superseded log.

- **Clauses fill the gap ACs and NFRs can't.** ACs test behavior on one request. NFRs measure aggregate properties. Clauses assert invariants that must hold *across the codebase*: "no PII in logs anywhere," "every write is audited," "no protected route without auth middleware." Things you can't express in one unit test.
- **Verdicts come with confidence percentages.** A 100% confidence verdict is rare and suspect — typical PASS lands 80–95%, typical FAIL 70–90%. Below 60% escalates to INDETERMINATE per INV-3 (don't present soft answers as hard ones).
- **Top-5 enforcement files is the audit trail.** When a clause flips from PASS to FAIL, the AI names which files lost the property and why. Reviewers go straight to the regression. Stale clauses (>14 days unchecked) auto-flip to INDETERMINATE and gate ship at Medium+ severity.

**Example excerpt** ([`example/features/demo-counter/CLAUSES.md`](./example/features/demo-counter/CLAUSES.md)):

```markdown
### CLA-01 — Client IP addresses must never appear in log lines

| Field | Value |
|---|---|
| **Severity** | High |
| **Last code check** | 2026-05-23 — `FAIL` (92% confidence) |
| **Last spec check** | 2026-05-23 — `PASS` (94% confidence) |

**Top 5 enforcement files** (ordered by relevance):
1. `server/click/handler.rs` — request entry point; current FAIL source
2. `server/click/logger.rs` — structured-log wrapper; should be single chokepoint
3. `tests/click/log_no_pii.rs` — currently FAILING test
...
```

---

### `prototypes/` — UX mockups (when `Applies: prototype`)

**What it captures.** UX prototype HTML (`index.html` + assets/) for stakeholder review before code. Served behind basic-auth at `/prototypes/` per spec §6.

- **A prototype is approval-gated before implementation.** A feature with `Prototype: required` cannot move from `Spec Ready` to `In Development` until `Prototype: approved` is set in SPEC frontmatter. The UX specialist signs off.
- **Basic-auth keeps non-prod mockups out of search engines.** Credentials live in the host's secrets store, never in the repo.

---

### How the files relate

```
PRD.md  (portfolio-wide, one per product)
  ↓ /vskit:prd-to-features
docs/features/<slug>/
  ├── SPEC.md          ← contract: what + acceptance criteria
  │     ↓ /vskit:critique spec  (specialists interrogate)
  │     ↑ updates from
  │   DECISIONS.md     ← rationale journal (the "why")
  │     ↓ propagates to
  │   DBSCHEMA.md      ← schema (if dbschema in Applies)
  │   INTERFACE-CONTRACTS.md  ← endpoints (if interface-contracts in Applies)
  │     ↓
  ├── TASKS.md         ← broken from §3 ACs, tracked to Done
  │     ↓ /vskit:implement feature
  │   code commits with Closes-AC: trailers
  │     ↓ /vskit:score feature
  ├── SCORE.md         ← 8 dims + composite + drift + history
  └── CLAUSES.md       ← invariants (if clauses in Applies); re-checked by /vskit:clause check
```

**Read order for a new feature:** SPEC → DECISIONS → CLAUSES (if any) → TASKS → SCORE. The first three are *what the feature is*; the last two are *how it gets built and graded*.

## What's in this bundle

```
vertical-slices-md-dev-kit/
├── README.md                          ← you are here
├── LICENSE                            ← MIT
├── CONTRIBUTING.md                    ← how to file issues and PRs
├── SECURITY.md                        ← vulnerability disclosure policy
├── CHANGELOG.md                       ← version history
├── ADOPTION.md                        ← under-an-hour adoption tutorial
├── WALKTHROUGH.md                     ← every command simulated end-to-end on one feature
├── vertical-slices-ai-framework.md    ← the spec (1027 lines, normative)
├── settings.json.snippet              ← .claude/settings.json Stop hook block
├── scripts/
│   └── worklog-stop-hook.sh           ← reference implementation of §5.2 Stop hook
├── templates/
│   ├── PRD.md                         ← §3.2 PRD template
│   ├── SPEC.md                        ← §4.3 SPEC template
│   ├── TASKS.md                       ← §4.4 tasks template
│   ├── DECISIONS.md                   ← §4.5 decisions template
│   ├── CLAUSES.md                     ← §4.7 clauses template (v1.8)
│   ├── SCORE.md                       ← §7.3 score template
│   └── CLAUDE.md-snippet.md           ← §9 CLAUDE.md §Commands snippet
├── example/
│   └── features/demo-counter/         ← one fully-populated feature folder (incl. CLAUSES.md)
└── case-studies/
    ├── README.md                      ← what counts as a case study
    ├── 01-self-adoption.md            ← the kit scores its own market-readiness
    └── 02-bab-bootstrap.md            ← (placeholder) first external adoption
```

## What "ready to adopt" means

You can pick this bundle up if:

- You write code with AI assistants and you have a `CLAUDE.md` (or equivalent) in the repo today.
- You ship to one repo, not a portfolio. Cross-repo governance is out of scope (spec §1).
- You're willing to hand-edit markdown. The bundle is not a SaaS — it's a methodology + a few shell scripts.

You should not adopt this bundle if:

- You need a hosted dashboard. The framework is file-based by design (INV-1: single source of truth).
- You're shipping a portfolio of microservices that need shared schemas. The spec is explicit about being per-repo.
- You're allergic to the discipline of writing acceptance criteria before writing code. The bundle does not work without that step.

## How vertical-slices-md-dev-kit is different from…

| Alternative | Difference |
|---|---|
| Plain `CLAUDE.md` instructions | `CLAUDE.md` tells the AI what to do; vertical-slices-md-dev-kit records what got done, with a ship gate |
| [GitHub Spec Kit](https://github.com/github/spec-kit) | Spec Kit scaffolds spec docs; vertical-slices-md-dev-kit adds **scoring**, **lifecycle computed from state**, and **commit-trailer traceability** |
| [BMAD method](https://github.com/bmadcode/BMAD-METHOD) | BMAD orchestrates AI agents for delivery; vertical-slices-md-dev-kit is the **quality layer** under whatever orchestration you already use |
| Cursor / Aider rule files | Editor-scoped style guides; vertical-slices-md-dev-kit is **per-feature lifecycle + scoring + audit** |

### Same task, side-by-side

Ship a feature ("rate-limited POST endpoint") with each approach. The difference is what the repo holds afterwards.

| Step | Plain CLAUDE.md | GitHub Spec Kit | vertical-slices-md-dev-kit |
|---|---|---|---|
| **1. Capture intent** | One paragraph in `CLAUDE.md` | `/specify` generates a SPEC document | PRD §6 line + SPEC §3 ACs (each independently verifiable) |
| **2. Decide auth / rate-limit shape** | In your head; maybe a code comment | Possibly captured in SPEC sections | **DECISIONS.md row** with rationale, citation, and propagation back to SPEC §3 + §4 |
| **3. Implement** | AI writes code; you review | AI writes code; you review | AI writes code; commit carries `Closes-AC: <slug>#AC-NN` + `Decision: D-NN` trailers |
| **4. Test** | Whatever your test runner says | Whatever your test runner says | Test runner + 8 scored dimensions across 8 parallel scorers |
| **5. Gate to ship** | Tests green = ship | Tests green = ship | Composite ≥ 8 AND security ≥ 8 AND every dim ≥ 7 AND `last_scored_sha` current AND no orphan decisions |
| **6. What the repo retains** | The diff + commit message | The SPEC + the diff | SPEC + DECISIONS journal + SCORE history + commit trailers that walk back to the AC and the decision that motivated it |
| **7. Six months later** | "Why does this code check IP again?" Read code, guess. | Read SPEC. Maybe matches. | `git log --grep='Decision: D-04'` → DECISIONS.md D-04 → rationale + alternatives considered + who raised it |

The headline: every approach can ship the same code. Only vertical-slices-md-dev-kit keeps the chain from *the question* to *the line of code* intact — and refuses to ship if any link in that chain breaks.

## Version

This is **v2.0**. See [`CHANGELOG.md`](./CHANGELOG.md) for what changed between versions. The spec carries `**Version:** 2.0` in its frontmatter — that is the authoritative version pointer.

## License

MIT. Bundle and reference scripts: copy, modify, ship, charge for the work you build on top. No attribution required, though a link back is appreciated.

## Spec authority

When the spec disagrees with this README, the README is wrong. Update the README. See `vertical-slices-ai-framework.md` §12.
