# Walkthrough — every command, in the order a real adoption flows

This document simulates vertical-slices-md-dev-kit end-to-end on one feature. It exercises every command in the spec at least once, in the order an actual adopter would touch them. Console output and file-system actions are both shown.

**Use this when:**
- You've finished [`ADOPTION.md`](./ADOPTION.md) and want to see what the full pipeline looks like.
- You're explaining vertical-slices-md-dev-kit to a stakeholder and want one continuous example instead of jumping between sections of the spec.
- You're implementing a command and want a reference for the expected output shape.

**Scenario:** Solo dev bootstraps a fresh repo called `clickcount` and ships the `demo-counter` feature (an HTTP click-tracking endpoint, the same example feature shipped in [`example/`](./example/)). The arc spans 7 days of wallclock.

**Honesty notice:** the commands below are simulated against the spec contracts. The reference scripts in [`scripts/`](./scripts/) implement the Stop hook; the orchestration commands (`/vskit:implement`, `/vskit:score`, `/vskit:critique spec`, etc.) are spec-described but not yet shipped as runtime binaries. The output shapes are what they will produce.

---

## Table of contents

- [Day 0 — Bootstrap](#day-0--bootstrap) · `/vskit:init-framework`
- [Day 1 — PRD](#day-1--prd) · `/vskit:review prd` · `/vskit:critique prd` · `/vskit:prd-to-features`
- [Day 2 — Spec the first feature](#day-2--spec-the-first-feature) · `/vskit:critique spec` · `/vskit:spec-to-tasks` · `/vskit:clause add` · `/vskit:project-status`
- [Day 3–5 — Implementation](#day-35--implementation) · `/vskit:implement` · `/vskit:test` · `/vskit:score` · `/vskit:clause check`
- [Day 6 — Status sweep before ship attempt](#day-6--status-sweep-before-ship-attempt) · `/vskit:project-status` · `/vskit:show-backlog` · `/vskit:next-task` · `/vskit:open-questions` · `/vskit:audit-traceability` · `/vskit:audit spec` · `/vskit:clause audit` · `/vskit:run-tests` · `/vskit:run-e2e` · `/vskit:security-review` · `/vskit:health-check` · `/vskit:report-overhead`
- [Day 7 — Close the gaps and ship](#day-7--close-the-gaps-and-ship) · `/vskit:score --force` · `/vskit:clause check` · `/vskit:check deploy` · `/vskit:ship` · `/vskit:ship-all`
- [Read-only command reference](#read-only-command-reference-any-time) · `/vskit:score-all` · `/vskit:gen-prototype-index`
- [Conditional / sub-init](#conditional--sub-init) · `/vskit:init-prototypes`
- [Full-PRD orchestrator](#full-prd-orchestrator-alternative-to-running-steps-individually) · `/vskit:run-pipeline prd`
- [Worklog snapshot across the whole arc](#what-the-worklog-looks-like-across-the-whole-arc)
- [Clauses — the `/vskit:clause` workflow (v1.8)](#clauses--the-clause-workflow-v18) · `/vskit:clause add` · `/vskit:clause check` · `/vskit:clause update` · `/vskit:clause remove` · `/vskit:clause list` · `/vskit:clause audit` · `/vskit:clause check-all`
- [Key invariants reinforced across the trace](#key-invariants-reinforced-across-the-trace)

---

# Day 0 — Bootstrap

## `/vskit:init-framework`

```
$ /vskit:init-framework

[init-framework] scaffolding vertical-slices-md-dev-kit v2.0 in /home/dev/clickcount
[init-framework] creating doc tree...
  ✓ docs/PRD.md (stub)
  ✓ docs/prds/draft/
  ✓ docs/features/
  ✓ docs/worklog/
  ✓ docs/prototypes/
  ✓ docs/incidents/
  ✓ docs/process/QA-GATE.md
  ✓ docs/technical/ARCHITECTURE.md
  ✓ docs/technical/ENV.md
  ✓ docs/technical/OBSERVABILITY.md
  ✓ docs/bundles/ (vendored from upstream)
[init-framework] writing CLAUDE.md §Commands stub
[init-framework] installing Stop hook → .claude/settings.json
[init-framework] embedding worklog-stop-hook.sh

Install pre-push hook that runs /vskit:audit-traceability and /vskit:check deploy? [Y/n] y
[init-framework] writing .git/hooks/pre-push (mode 0755)

Done. Next step: write your first PRD draft at docs/prds/draft/<date>-<slug>.md
```

**Actions taken:**
```
created  docs/ (full §1 tree)
created  CLAUDE.md (with §Commands section)
created  .claude/settings.json (Stop hook block)
created  .claude/scripts/worklog-stop-hook.sh (mode 0755)
created  .git/hooks/pre-push (mode 0755)
appended docs/worklog/2026-05-23.md (row 1)
```

---

# Day 1 — PRD

Dev writes a draft PRD at `docs/prds/draft/2026-05-23-clickcount.md` — vision, goals, evidence, 3 features (F-01: ingest, F-02: query, F-03: demo-counter).

## `/vskit:review prd docs/prds/draft/2026-05-23-clickcount.md`

```
$ /vskit:review prd docs/prds/draft/2026-05-23-clickcount.md

[review] Round 1 — launching 11 specialists in parallel

  product-owner       . . . . . . done   → 7  ("§3 customer evidence has 2 verbatim signals, needs ≥3")
  task-manager        . . . . . . done   → 9
  backend-lead        . . . . . . done   → 8  ("§7 missing rate-limit baseline")
  frontend-lead       . . . . . . done   → 8  ("§7 no WCAG baseline")
  db-architect        . . . . . . done   → 9
  testing-lead        . . . . . . done   → 6  ("§2 metric 'fast' not measurable; §3.2 PRE tests missing")
  devops-lead         . . . . . . done   → 7  ("§10 dashboards listed but no SLO numbers")
  security-specialist . . . . . . done   → 8  ("§7 auth model OK; PII in metrics §10 row 3")
  perf-specialist     . . . . . . done   → 7  ("§7 'fast' is not p95<Xms")
  prompt-engineer     . . . . . . done   → 8  ("§13 questions exist but lack owners")
  ux-specialist       . . . . . . done   → 9

Round 1 result: min score 6 (testing-lead). 7 specialists < 9.
PRD updated with concerns. Revise and re-run.

[review] Round 2 — after revisions
  ... all scores ≥ 9 ✓

[review] PRD ready to promote. Run:
  git mv docs/prds/draft/2026-05-23-clickcount.md docs/prds/2026-05-23-clickcount.md
```

**Actions taken:**
```
modified  docs/prds/draft/2026-05-23-clickcount.md (appended ## Round-Table Scores rows)
modified  docs/prds/draft/2026-05-23-clickcount.md (appended ## Score History rows)
appended  docs/worklog/2026-05-23.md (row 2)
```

Dev moves the file:

```
$ git mv docs/prds/draft/2026-05-23-clickcount.md docs/prds/2026-05-23-clickcount.md
```

## `/vskit:critique prd docs/prds/2026-05-23-clickcount.md`

```
$ /vskit:critique prd docs/prds/2026-05-23-clickcount.md

[critique] interrogating PRD as prompt-engineer

  Q1: §1 says "fast and reliable" — what's fast? what's reliable?
      → inline annotation added at §1 line 7
  Q2: §6 F-03 description is "tracking endpoint" — measured how?
      → annotation added at §6 line 14
  Q3: §13 row "should we cache?" has no owner.
      → annotation added at §13 line 22

3 inline questions added. §13 Open Questions table populated.
Resolve these, then re-run /vskit:review prd to confirm scores hold.
```

**Actions taken:**
```
modified  docs/prds/2026-05-23-clickcount.md (3 inline > Q: comments + §13 rows)
appended  docs/worklog/2026-05-23.md (row 3)
```

## `/vskit:prd-to-features docs/prds/2026-05-23-clickcount.md`

```
$ /vskit:prd-to-features docs/prds/2026-05-23-clickcount.md

[prd-to-features] reading PRD §6 Features & Epics
  F-01: ingest         → docs/features/ingest/
  F-02: query          → docs/features/query/
  F-03: demo-counter   → docs/features/demo-counter/

For each feature, scaffolding:
  ✓ docs/features/ingest/{SPEC,TASKS,SCORE,DECISIONS}.md
  ✓ docs/features/query/{SPEC,TASKS,SCORE,DECISIONS}.md
  ✓ docs/features/demo-counter/{SPEC,TASKS,SCORE,DECISIONS}.md

Conditional files NOT created (Applies undeclared yet):
  - DBSCHEMA.md
  - INTERFACE-CONTRACTS.md
  - prototypes/

3 feature folders created. Next: /vskit:critique spec <slug> for each.
```

**Actions taken:**
```
created   docs/features/{ingest,query,demo-counter}/SPEC.md (stubs)
created   docs/features/{ingest,query,demo-counter}/TASKS.md (headers only)
created   docs/features/{ingest,query,demo-counter}/SCORE.md (all dims 0)
created   docs/features/{ingest,query,demo-counter}/DECISIONS.md (headers only)
appended  docs/worklog/2026-05-23.md (row 4)
```

---

# Day 2 — Spec the first feature

## `/vskit:critique spec demo-counter`

```
$ /vskit:critique spec demo-counter

[critique] reading docs/features/demo-counter/SPEC.md
[critique] declared Applies: [] — interrogating to set it

  prompt-engineer:    "Feature talks to a DB. Applies should include dbschema."
  prompt-engineer:    "Feature exposes /click and /click/:campaign. Applies should include interface-contracts."
  → SPEC frontmatter updated: Applies: [dbschema, interface-contracts]
  → DBSCHEMA.md created; INTERFACE-CONTRACTS.md created

[critique] launching specialists

  security-specialist: "Rate-limit storage — in-memory or Redis? You haven't said."
    Decision raised → D-01: in-memory token bucket, per-instance
    Updates: SPEC.md §3 AC-04, §4 Quota row, §10 note 1
    Propagating... ✓

  security-specialist: "Max campaign-name length? Unbounded text in a public POST is a DoS vector."
    Decision raised → D-02: 64 chars after Unicode NFC normalization
    Updates: SPEC.md §3 AC-03, §9 Q-02; INTERFACE-CONTRACTS.md POST /click body schema
    Propagating... ✓

  security-specialist: "What goes in logs? §4 Security row says 'no PII' but doesn't define."
    Decision raised → D-03: campaign + ts + status only. Never IP.
    Updates: SPEC.md §3 AC-07, §4 Security row
    Propagating... ✓

  db-architect: "Is a Down migration required? Spec §4.6 says yes for existing-table changes."
    Decision raised → D-04: DROP TABLE + DROP INDEX is acceptable rollback.
    Updates: DBSCHEMA.md ## Migrations M-01
    Propagating... ✓

  product-owner: "Auth required on POST /click?"
    Decision raised → D-05: No — public endpoint, rate-limit is the abuse control.
    Updates: SPEC.md §4 Security row; INTERFACE-CONTRACTS.md POST /click auth
    Propagating... ✓

[critique] 5 decisions logged. 3 deferred items recorded (DEF-01..DEF-03).
[critique] checking propagation contract... ✓ no orphan rows
[critique] Prototype field set: N/A (no user-facing UI)

Documentation score now: 9. Spec ready for /vskit:spec-to-tasks.
```

**Actions taken:**
```
modified  docs/features/demo-counter/SPEC.md (frontmatter Applies, §3 ACs, §4 NFRs, §9 Q-02 resolved, §10 note)
created   docs/features/demo-counter/DBSCHEMA.md (table + index + M-01)
created   docs/features/demo-counter/INTERFACE-CONTRACTS.md (POST + GET specs)
modified  docs/features/demo-counter/DECISIONS.md (D-01..D-05 + DEF-01..DEF-03 rows)
appended  docs/worklog/2026-05-24.md (row 1)
```

## `/vskit:spec-to-tasks feature demo-counter`

```
$ /vskit:spec-to-tasks feature demo-counter

[spec-to-tasks] reading SPEC.md §3 (8 ACs) + DECISIONS.md (5 decisions)
[spec-to-tasks] task-manager generating TASKS rows

  T-01  Add `clicks` table + index migration M-01           db-architect    High    AC-01,AC-05,AC-08  —
  T-02  Implement POST /click handler                       backend-lead    High    AC-01,AC-02        —
  T-03  Implement GET /click/:campaign handler              backend-lead    High    AC-05,AC-06        —
  T-04  Campaign-length cap at 64 chars + Unicode NFC       backend-lead    Medium  AC-03              D-02
  T-05  Per-IP rate limiter (60/min token bucket)           backend-lead    High    AC-04              D-01
  T-06  Structured logging (campaign field; scrub IPs)      devops-lead     Medium  AC-07              D-03
  T-07  Down migration for M-01                             db-architect    Medium  AC-08              D-04
  T-08  Unit + integration tests (TC-01..TC-04)             testing-lead    High    AC-01..AC-06       —
  T-09  E2E test simulating tracking pixel load (TC-05)     testing-lead    Medium  AC-01,AC-05        —
  T-10  Load test p95 < 50ms at 200rps                      perf-specialist Low     NFR row 1          —

10 tasks created. 4 tasks tagged with their Decision source.
TASKS.md populated. Feature now in lifecycle state: Spec Ready.
```

**Actions taken:**
```
modified  docs/features/demo-counter/TASKS.md (10 rows added)
appended  docs/worklog/2026-05-24.md (row 2)
```

## `/vskit:clause add demo-counter "..." --severity=...`

The spec-grill produced 5 decisions, three of which encode **invariants** that no single AC can test on its own. The dev formalizes them as clauses now (before any code exists) so future implementation can be checked against them continuously.

```
$ /vskit:clause add demo-counter "Client IP addresses must never appear in log lines" --severity=high

[clause add] Applies frontmatter: appending 'clauses' → [dbschema, interface-contracts, clauses]
[clause add] creating docs/features/demo-counter/CLAUSES.md (was missing)
[clause add] appending CLA-01 (severity High)
[clause add] running baseline /vskit:clause check demo-counter CLA-01
  spec check  → PASS (94%) — anchored in SPEC §3 AC-07, §4 Security, DECISIONS D-03
  code check  → INDETERMINATE (no implementation yet; deferred)

CLA-01 created. Code check will be meaningful after /implement runs.

$ /vskit:clause add demo-counter "All campaign strings must be NFC-normalized before any DB write" --severity=medium
  → CLA-02 added · spec PASS 96% · code INDETERMINATE (no code yet)

$ /vskit:clause add demo-counter "Migration M-01 must be idempotent via the migration runner's dedup" --severity=medium
  → CLA-03 added · spec PASS 88% · code INDETERMINATE (no code yet)

[clause add] 3 clauses now active for demo-counter (all baseline INDETERMINATE on code).
```

**Actions taken:**
```
modified  docs/features/demo-counter/SPEC.md (Applies: clauses appended)
created   docs/features/demo-counter/CLAUSES.md (3 CLA rows)
appended  docs/worklog/2026-05-24.md (rows 3–5)
```

## `/vskit:project-status` (quick status check)

```
$ /vskit:project-status

vertical-slices-md-dev-kit v2.0 — clickcount @ HEAD a3f7c12

FEATURE        STATE              PRIORITY  COMPOSITE  BLOCKERS
ingest         Backlog            High      —          —
query          Backlog            Medium    —          —
demo-counter   Spec Ready         Medium    0.0/10     —

Score floor:  every dim ≥ 7 · composite ≥ 8.0 · security ≥ 8
Lifecycle:    computed (INV-2) — none of the above is hand-edited

Tip: demo-counter is Spec Ready. Next command: /vskit:implement feature demo-counter
```

**Actions taken:** none — read-only.

---

# Day 3–5 — Implementation

## `/vskit:implement feature demo-counter`

```
$ /vskit:implement feature demo-counter

[implement] checking implementation gate (§10.2)...
  ✓ Documentation score 9 ≥ 7
  ✓ DBSCHEMA.md has content (table: clicks)
  ✓ INTERFACE-CONTRACTS.md has content (POST /click, GET /click/:campaign)
  ✓ TASKS.md has 10 Pending rows
  ✓ DECISIONS.md has no orphan rows
  ✓ Prototype: N/A (not required)

[implement] dispatching tasks to owners

  T-01 → db-architect ... writing server/db/migrations/20260525_clicks.sql
         committing: "feat(clicks): create table + index (M-01)"
         trailer: Closes-AC: demo-counter#AC-01 demo-counter#AC-05 demo-counter#AC-08
         ✓ T-01 → Done

  T-02 → backend-lead ... writing server/click/handler.rs
         committing: "feat(click): POST handler with validation"
         trailer: Closes-AC: demo-counter#AC-01 demo-counter#AC-02
         ✓ T-02 → Done

  T-03 → backend-lead ... writing server/click/get_count.rs
         committing: "feat(click): GET /click/:campaign"
         trailer: Closes-AC: demo-counter#AC-05 demo-counter#AC-06
         ✓ T-03 → Done

  T-04 → backend-lead ... 64-char cap + NFC normalization
         committing: "feat(click): cap campaign at 64 chars, NFC-normalize"
         trailer: Closes-AC: demo-counter#AC-03  Decision: demo-counter#D-02
         ✓ T-04 → Done

  T-05 → backend-lead ... token-bucket rate limiter
         committing: "feat(click): per-IP rate limit 60/min"
         trailer: Closes-AC: demo-counter#AC-04  Decision: demo-counter#D-01
         ✓ T-05 → Done

  T-06 → devops-lead ... structured logs (in progress — needs IP scrubbing)
         ⚠ T-06 → In Progress (1 file written, AC-07 not yet satisfied)

  T-07 → db-architect ... Down migration
         committing: "feat(clicks): M-01 rollback steps"
         trailer: Closes-AC: demo-counter#AC-08  Decision: demo-counter#D-04
         ✓ T-07 → In Review (PR open for db-architect peer review)

  T-08 → testing-lead ... unit + integration tests (in progress)
         ⚠ T-08 → In Progress

  T-09 → testing-lead ... not started — depends on T-06
         ↻ T-09 → Pending

  T-10 → perf-specialist ... not started
         ↻ T-10 → Pending

[implement] 5 tasks Done · 2 In Progress · 1 In Review · 2 Pending
[implement] feature state now: In Development
```

**Actions taken:**
```
created   server/click/handler.rs
created   server/click/get_count.rs
created   server/click/rate_limit.rs
created   server/click/validation.rs
created   server/db/migrations/20260525_clicks.sql
created   server/click/logger.rs (partial — T-06 in progress)
modified  docs/features/demo-counter/TASKS.md (10 row statuses updated)
6 git commits with Closes-AC: trailers
appended  docs/worklog/2026-05-25.md (rows 1–6)
```

## `/vskit:test feature demo-counter`

```
$ /vskit:test feature demo-counter

[test] running tests scoped to Touches: [server/click/**]

  TC-01 unit validation       . . . . . . . . PASS (12 assertions)
  TC-02 unit rate-limit math  . . . . . . . . PASS (8 assertions)
  TC-03 integration round-trip . . . . . . . . PASS
  TC-04 concurrency           . . . . . . . . FAIL (T-08 in progress)
  TC-05 E2E pixel load        . . . . . . . . SKIP (T-09 pending)

  AC-07 logging contract      . . . . . . . . FAIL (T-06 in progress — logs include peer_addr)

3 PASS · 1 FAIL · 1 SKIP · 1 contract-fail

Drift found: server/click/handler.rs:42 logs req.peer_addr() — violates D-03.
This will surface in /score under Drift Findings.
```

**Actions taken:**
```
modified  docs/features/demo-counter/SCORE.md §test-coverage notes
appended  docs/worklog/2026-05-25.md (row 7)
```

## `/vskit:score feature demo-counter`

```
$ /vskit:score feature demo-counter

[score] cache check: git diff <empty>..HEAD -- docs/features/demo-counter/ server/click/**
[score] cache miss (first scoring, no last_scored_sha)
[score] launching 8 scorers in parallel

  Documentation        → prompt-engineer        ... 9   (all sections present, all DECISIONS rows have Updates)
  Test Coverage        → testing-lead           ... 6   (TC-01..TC-03 done; TC-04 fail, TC-05 skip; AC-07 no test)
  Module Clarity       → backend-lead           ... 8   (clean server/click/ boundary, ≤1 minor: rate-limiter clock coupling)
  Requirements Cov     → product-owner          ... 9   (all PRD §2/§6 items map to ACs)
  Logging              → devops-lead            ... 5   (T-06 incomplete; AC-07 not met)
  Error Handling       → backend-lead           ... 8   (4xx/5xx paths named; 1 minor: generic 500 message)
  Security             → security-specialist    ... 8   (input validation OK; rate-limit per-instance only, doc'd D-01)
  NFR Compliance       → perf-specialist        ... 6   (quotas enforced; latency not measured — T-10 pending)

Composite: 7.4 / 10 (mean of 8 scored dims, rounded to 1 dp)
Ship gate: SOFT BLOCK
  - composite 7.4 < 8.0
  - Logging 5 < 7 floor
  - Test Coverage 6 < 7 floor
  - NFR 6 < 7 floor
  (Security 8 ≥ 8 ✓ — hard floor cleared)

Drift Findings:
  AC-07: server/click/handler.rs:42 — peer_addr in log line. Violates D-03.

Improvement Actions written:
  ACTION-01: Finish T-06 (Logging 5 → 8)
  ACTION-02: Finish T-08, T-09 (Test Coverage 6 → 9)
  ACTION-03: Run T-10 (NFR 6 → 9)
  ACTION-04: Fix handler.rs:42 (closes the drift)

last_scored_sha updated → b9e4d22
```

**Actions taken:**
```
modified  docs/features/demo-counter/SCORE.md (8 rows, composite, history row, drift findings, actions)
appended  docs/worklog/2026-05-25.md (row 8)
```

## `/vskit:clause check demo-counter`

The dev re-checks clauses against real code now that the implementation has landed. CLA-01 was INDETERMINATE on Day 2 (no code) — it now has something to grade against.

```
$ /vskit:clause check demo-counter

[clause check] scorer: security-specialist
[clause check] re-checking 3 active clauses against HEAD (b9e4d22)

  CLA-01  "Client IP addresses must never appear in log lines"  [High]
    spec  → PASS  (94%) — anchors unchanged
    code  → FAIL  (92%) — server/click/handler.rs:42 logs req.peer_addr() directly,
                         bypassing logger.rs. Same root cause as AC-07 drift.
    transition: INDETERMINATE → FAIL

  CLA-02  "All campaign strings must be NFC-normalized before any DB write"  [Medium]
    spec  → PASS  (96%)
    code  → PASS  (88%) — normalize_campaign() at validation.rs:12 is the single chokepoint;
                         one cfg(test) bypass noted but not live.
    transition: INDETERMINATE → PASS ✓

  CLA-03  "Migration M-01 must be idempotent via the migration runner's dedup"  [Medium]
    spec  → PASS  (88%) — runner dedup referenced in DBSCHEMA.md migrate.rs callout
    code  → PASS  (85%) — schema_migrations table prevents re-run
    transition: INDETERMINATE → PASS ✓

Summary: 1 FAIL · 2 PASS
Ship-gate effect: HARD BLOCK (CLA-01 is High + FAIL + 92% confidence ≥ 80%)
exit code: 1
```

**The hard block.** CLA-01 escalates the demo-counter ship status from "soft block on composite/dim floors" to "hard block from a High-severity clause" per §10.3 v1.8. Even if every score floor were cleared, deployment would refuse until CLA-01 lands PASS — or until the dev downgrades its severity with a written rationale (audit-trail) or removes it entirely.

**Actions taken:**
```
modified  docs/features/demo-counter/CLAUSES.md (3 rows updated with code-check verdicts)
appended  docs/worklog/2026-05-25.md (row 9)
```

---

# Day 6 — Status sweep before ship attempt

## `/vskit:project-status`

```
$ /vskit:project-status

vertical-slices-md-dev-kit v2.0 — clickcount @ HEAD b9e4d22

FEATURE        STATE              PRIORITY  COMPOSITE  BLOCKERS
ingest         Backlog            High      —          —
query          Backlog            Medium    —          —
demo-counter   In Development     Medium    7.4/10     SOFT BLOCK on ship

Failing dims (demo-counter):  Logging(5)  Test-Coverage(6)  NFR(6)
Security:                     8 ✓ (hard floor cleared)
```

## `/vskit:show-backlog`

```
$ /vskit:show-backlog --status=open

Open tasks across all features (Pending + In Progress + In Review):

demo-counter:
  T-06  Structured logging (campaign; scrub IPs)   devops-lead    In Progress  AC-07 (D-03)
  T-07  Down migration for M-01                    db-architect   In Review    AC-08 (D-04)
  T-08  Unit + integration tests (TC-01..TC-04)    testing-lead   In Progress  AC-01..AC-06
  T-09  E2E tracking pixel load                    testing-lead   Pending      AC-01,AC-05
  T-10  Load test p95<50ms@200rps                  perf-specialist Pending     NFR row 1

5 open. By priority: 1 High · 3 Medium · 1 Low.
```

## `/vskit:next-task`

```
$ /vskit:next-task

Highest-priority unblocked task: T-08 (High)
  Unit + integration tests (TC-01..TC-04) — testing-lead — demo-counter
  Blocks: nothing
  Blocked by: nothing
  Closes: Test Coverage floor (6 → ≥7 needed for ship)

Recommended next action: complete T-08 to clear the Test Coverage floor.
```

## `/vskit:next-task`

```
$ /vskit:next-task

State: demo-counter is In Development with 3 dims below floor (Logging 5, TC 6, NFR 6).
Security and Documentation are above floor.

Sequence I'd run:
  1. Finish T-06 (Logging) — single highest score lift, single owner
  2. Finish T-08 (Test Coverage) — clears TC floor, unblocks T-09
  3. Run T-10 (load test) — confirms NFR p95
  4. /vskit:score feature demo-counter --force (re-evaluate)
  5. /vskit:check deploy (expect gate pass)

Estimated wallclock: ~4 hours focused work for T-06+T-08; T-10 is async.
```

## `/vskit:open-questions`

```
$ /vskit:open-questions

Across all feature SPECs:

ingest        — no SPEC yet (Backlog)
query         — no SPEC yet (Backlog)
demo-counter  — 2 questions, both Resolved:
                Q-01: third aggregate endpoint? → Resolved (no, BI reads table)
                Q-02: non-ASCII campaign names? → Resolved (yes, NFC-normalize)

PRD-level (docs/PRD.md §13):
  Q-03: portfolio-level dashboard owner?    open  product-owner   target 2026-06-01
  Q-04: shared rate-limit cap defaults?     open  devops-lead     target 2026-06-15

No feature-level open questions blocking lifecycle.
```

## `/vskit:audit-traceability`

```
$ /vskit:audit-traceability

[audit] git log <last tag or merge-base origin/main>..HEAD
[audit] scanning 6 non-merge commits

  a3f7c12  chore: adopt vertical-slices-md-dev-kit v2.0                            ✓ Closes-AC: bootstrap#AC-01
  c4d8e23  feat(clicks): create table + index (M-01)          ✓ Closes-AC: demo-counter#AC-01,AC-05,AC-08
  e5f9a34  feat(click): POST handler with validation          ✓ Closes-AC: demo-counter#AC-01,AC-02
  f6a0b45  feat(click): GET /click/:campaign                  ✓ Closes-AC: demo-counter#AC-05,AC-06
  17b1c56  feat(click): cap campaign at 64 chars, NFC         ✓ Closes-AC: demo-counter#AC-03  Decision: demo-counter#D-02
  28c2d67  feat(click): per-IP rate limit 60/min              ✓ Closes-AC: demo-counter#AC-04  Decision: demo-counter#D-01

6/6 commits trace to an AC. 0 warnings.
exit code: 0
```

## `/vskit:audit spec`

```
$ /vskit:audit spec

[audit] reading all docs/features/*/SPEC.md

  ingest        — §3 has no ACs (Backlog, expected)
  query         — §3 has no ACs (Backlog, expected)
  demo-counter  — §4.3 sections complete ✓
                  Touches: [server/click/**, …] resolves to 6 files ✓
                  All commits with `demo-counter#` trailers touched files within Touches scope ✓
                  No INC↔SPEC conflicts (docs/incidents/ empty)

0 warnings. exit code: 0
```

## `/vskit:clause audit`

```
$ /vskit:clause audit

[clause audit] scanning docs/features/ for CLAUSES.md

  ingest         — no CLAUSES.md (clauses not in Applies)
  query          — no CLAUSES.md (clauses not in Applies)
  demo-counter   — 3 active clauses
                   CLA-01: High,   FAIL 92% (code) — HARD BLOCK on ship
                   CLA-02: Medium, PASS 88% (code) — OK
                   CLA-03: Medium, PASS 85% (code) — OK, 1 day since last check

Summary across repo:
  1 FAIL  (1 hard-blocking)
  0 INDETERMINATE
  0 stale
  2 passing

exit code: 1
```

**Read-only.** No files written; the report is the artifact. Same root cause as the `/vskit:audit-traceability` and `/vskit:score` outputs above — `handler.rs:42`. Three audit commands now agree it must be fixed before ship: drift findings, AC-07 failing test, and CLA-01.

## `/vskit:run-tests`

```
$ /vskit:run-tests
  ... full suite invoked via repo override: `cargo test`

running 42 tests
test click::validation::tests::nfc_normalize ............. ok
test click::validation::tests::length_cap ................ ok
test click::rate_limit::tests::token_bucket_math ......... ok
... [37 more] ...
test click::handler::tests::concurrency_race ............. FAILED  (T-08 in progress)
test click::handler::tests::log_no_pii ................... FAILED  (T-06 in progress)

40 passed; 2 failed; 0 ignored
```

**Actions taken:** updates SCORE.md §test-coverage notes for `demo-counter`.

## `/vskit:run-e2e`

```
$ /vskit:run-e2e
  ... BASE_URL=http://localhost:3000 npx playwright test

  pixel-load.spec.ts                  SKIP  (T-09 not implemented yet)
  campaign-flow.spec.ts               PASS  (3 assertions)

1 passed; 1 skipped; 0 failed.
Screenshots: docs/testing/e2e-2026-05-25/
```

## `/vskit:security-review`

```
$ /vskit:security-review

[security-review] security-specialist auditing the full codebase

  ✓ server/click/validation.rs        — input bounded, NFC applied
  ✓ server/click/rate_limit.rs        — token bucket implementation safe
  ⚠ server/click/handler.rs:42        — DRIFT: logs peer_addr (violates D-03)
  ✓ server/db/migrations/*            — no raw SQL interpolation
  ✓ Cargo.toml                        — all deps pinned

1 finding. Severity: medium (logged data violates explicit decision).
No incident filed (drift already tracked in SCORE.md). Fix via ACTION-04.
```

## `/vskit:health-check`

```
$ /vskit:health-check
  GET http://localhost:3000/health        200 OK   (12ms)
  GET http://localhost:5432/health        N/A      (postgres direct check)
  postgres: 1 connection, 0 locks
  ulm CLI: not deployed (this repo is server-side)

All dependencies healthy.
```

## `/vskit:report-overhead`

```
$ /vskit:report-overhead

Repo: clickcount
Window: 2026-05-19 → 2026-05-25 (last 7 days)
Tokens: ~64k / 100k budget   [OK]
Wallclock: 6h 22m
Top commands:
  /vskit:implement feature demo-counter   ~22k
  /vskit:critique spec demo-counter          ~14k
  /vskit:review prd                  ~12k
  /vskit:score feature demo-counter       ~8k
  others                            ~8k
Status: OK (week 1 — no breach)

Estimates marked ~
```

**Actions taken:** archives any worklog older than 90 days (none in this case).

---

# Day 7 — Close the gaps and ship

Dev finishes T-06, T-08, fixes the drift, runs T-10. New commits land:

```
  c8e3f45  fix(click): drop peer_addr from log line          Closes-AC: demo-counter#AC-07
  d9f4a56  feat(click): finish concurrency tests             Closes-AC: demo-counter#AC-04
  e0a5b67  perf(click): load test confirms p95=23ms@200rps   Closes-AC: demo-counter#NFR-1
```

## `/vskit:score feature demo-counter`

```
$ /vskit:score feature demo-counter

[score] cache check: git diff b9e4d22..HEAD -- docs/features/demo-counter/ server/click/**
[score] cache miss (10 new commits, 3 files changed in Touches scope)
[score] full re-score

  Documentation        → 9
  Test Coverage        → 9  (was 6 — T-08 + T-09 done)
  Module Clarity       → 8
  Requirements Cov     → 9
  Logging              → 8  (was 5 — T-06 done, drift fixed)
  Error Handling       → 8
  Security             → 8
  NFR Compliance       → 9  (was 6 — T-10 confirmed p95=23ms)

Composite: 8.5 / 10
Ship gate: PASS
  ✓ composite 8.5 ≥ 8.0
  ✓ every dim ≥ 7
  ✓ security 8 ≥ 8

last_scored_sha updated → e0a5b67
```

## `/vskit:clause check demo-counter` (after the fix)

```
$ /vskit:clause check demo-counter

[clause check] re-checking 3 active clauses against HEAD (e0a5b67)

  CLA-01  [High]    code → PASS (96%) — handler.rs:42 removed; logger.rs is single
                                         chokepoint; tests/click/log_no_pii.rs green
                    transition: FAIL → PASS ✓
  CLA-02  [Medium]  code → PASS (88%) — unchanged
  CLA-03  [Medium]  code → PASS (85%) — unchanged

Summary: 3 PASS · 0 FAIL · 0 INDETERMINATE
Ship-gate effect: clear
exit code: 0
```

## `/vskit:check deploy`

```
$ /vskit:check deploy

[check deploy] read-only ship-gate evaluation across all features

  ingest         — Backlog (not deployable; not in scope)
  query          — Backlog (not deployable; not in scope)
  demo-counter   — Composite 8.5  Security 8  Tasks 10/10 Done  Trailers ✓  Decisions ✓
                  Clauses: 3/3 PASS (CLA-01 H ✓ CLA-02 M ✓ CLA-03 M ✓)  no stale
                  ✓ HARD floor cleared (incl. v1.8 clause hard-block check)
                  ✓ SOFT floor cleared

Deployable features: demo-counter
exit code: 0
```

**Actions taken:** none — read-only.

## `/vskit:ship feature demo-counter` (orchestrator)

```
$ /vskit:ship feature demo-counter

[ship] step 1/4: /vskit:test feature demo-counter
  ... all passing ✓

[ship] step 2/4: /vskit:score feature demo-counter (cached — diff clean since e0a5b67)
  [cached] last_scored_sha=e0a5b67 diff=clean → 8.5/10 ✓

[ship] step 3/4: /vskit:check deploy
  exit 0 — proceeding

[ship] step 4/4: /vskit:deploy (repo override: `cargo build --release && ./scripts/vskit:deploy.sh`)
  Compiling clickcount v0.1.0
  Finished release [optimized] in 47.2s
  → deploying to prod...
  → health check passed (200 OK after 4.2s)
  ✓ deployed

Score history row appended (Trigger: deploy).
Feature lifecycle now: Shipped.
```

**Actions taken:**
```
modified  docs/features/demo-counter/SCORE.md (Score History row: deploy trigger)
created   target/release/clickcount (build artifact)
appended  docs/worklog/2026-05-26.md (rows 1–4 — one per orchestrated step)
```

## `/vskit:ship-all`

```
$ /vskit:ship-all

[ship-all] scanning features for Spec Ready or Testing

  ingest         — Backlog (skip)
  query          — Backlog (skip)
  demo-counter   — Shipped (skip — already deployed)

No eligible features. Nothing to ship.
exit code: 0
```

---

# Read-only command reference (any time)

## `/vskit:score-all`

```
$ /vskit:score-all

[score-all] iterating docs/features/

  ingest         — no SPEC §3 ACs yet; skipping (Backlog)
  query          — no SPEC §3 ACs yet; skipping (Backlog)
  demo-counter   — [cached] last_scored_sha=e0a5b67 diff=clean → 8.5/10

Updated: 0 features. Cached: 1. Skipped: 2.
```

## `/vskit:gen-prototype-index`

```
$ /vskit:gen-prototype-index

[gen-prototype-index] scanning docs/features/*/prototypes/

  No feature has 'prototype' in Applies — nothing to index.
  docs/prototypes/index.html: unchanged (empty stub)
```

---

# Conditional / sub-init

## `/vskit:init-prototypes` (only when a feature adds `prototype` to Applies)

```
$ /vskit:init-prototypes

[init-prototypes] new prototype feature detected: signup-flow
[init-prototypes] creating docs/prototypes/index.html skeleton ... ✓

App name slug for basic-auth (used in htpasswd path) [clickcount]: clickcount
Basic-auth username for prototypes: marketing-review
New password: ****
Re-type password: ****

[init-prototypes] htpasswd written → /etc/nginx/secrets/htpasswd/clickcount-prototypes

Paste this into your nginx config:
─────────────────────────────────────────────────
location /prototypes/ {
    alias /home/dev/clickcount/docs/prototypes/;
    auth_basic "Prototypes — clickcount";
    auth_basic_user_file /etc/nginx/secrets/htpasswd/clickcount-prototypes;
    autoindex on;
    try_files $uri $uri/ /prototypes/index.html;
}
─────────────────────────────────────────────────
```

---

# Full-PRD orchestrator (alternative to running steps individually)

## `/vskit:run-pipeline prd docs/prds/2026-05-23-clickcount.md`

```
$ /vskit:run-pipeline prd docs/prds/2026-05-23-clickcount.md

[prd-e2e] step 1: /vskit:review prd  (iterating until all ≥ 9, max 5 rounds)
  round 1 → min=6 (testing-lead) — revising
  round 2 → min=9 ✓
[prd-e2e] step 2: /vskit:critique prd
  3 inline questions added
[prd-e2e] step 3: /vskit:prd-to-features
  3 feature folders created
[prd-e2e] step 4: per-feature /vskit:ship feature

  → ingest:        critique needs human input on §2 scope — HALT

[prd-e2e] halted at feature 1/3 (ingest).
[prd-e2e] partial progress preserved on disk. Resume by running:
            /vskit:critique spec ingest    (after addressing §2 scope)
            then re-run /vskit:run-pipeline prd (it will skip completed steps)
```

**Halt rules:** the orchestrator stops on the first non-zero step. State already written (DECISIONS rows, TASKS rows, commits) is preserved; resumes from observable state on re-run (spec §8.4).

---

# What the worklog looks like across the whole arc

```markdown
# Work Log — 2026-05-25

## 09:14 UTC

| # | Command / Prompt | Agent(s) | Duration | Tokens (est.) | Outcome |
|---|-----------------|----------|----------|---------------|---------|
| 1 | /vskit:implement feature demo-counter | backend-lead,db-architect,devops-lead | 42 min | ~22k | 5 Done · 2 InProgress · 1 InReview · 2 Pending |
| 2 | /vskit:test feature demo-counter | testing-lead | 4 min | ~3k | 3 PASS · 1 FAIL · 1 SKIP |
| 3 | /vskit:score feature demo-counter | 8 parallel scorers | 6 min | ~8k | composite 7.4 SOFT BLOCK |
| 4 | /vskit:project-status | self-review | 0s | ~0 | terminal view (no writes) |
| 5 | /vskit:next-task | task-manager | 0s | ~0 | T-08 recommended |
| 6 | /vskit:open-questions | prompt-engineer | 0s | ~0 | 0 blocking |
| 7 | /vskit:audit-traceability | self-review | 1s | ~0 | 6/6 commits OK |
| 8 | /vskit:run-tests | testing-lead | 18s | ~2k | 40 pass · 2 fail |
| 9 | /vskit:clause check demo-counter | security-specialist | 3 min | ~4k | 1 FAIL (CLA-01) · 2 PASS — HARD BLOCK on ship |
| 10 | /vskit:clause audit | self-review | 2s | ~0 | 1 FAIL hard-blocking; 2 passing |

**Total:** 55 min | ~39k tokens | Features touched: demo-counter | Tasks completed: 5

Estimates marked ~
```

---

# Clauses — the `/vskit:clause` workflow (v1.8)

> **Reading guide.** The day-by-day arc above already exercises `/vskit:clause add` (Day 2), `/vskit:clause check` (Day 5 and Day 7), and `/vskit:clause audit` (Day 6). This section is a **complete command reference** — it re-shows those commands for completeness and adds the four the natural arc doesn't reach: `/vskit:clause list`, `/vskit:clause update`, `/vskit:clause remove`, `/vskit:clause check-all`. Skip down to `/vskit:clause list` or `/vskit:clause update` if you've already followed the arc.

Clauses (§4.7) cover invariants the existing artifacts cannot: properties that hold *across the codebase*, not per-request behavior (ACs) or measured numbers (NFRs). The dev opts in by adding `clauses` to `Applies:`. Five per-feature commands plus two global commands manage them.

In the demo-counter arc above, AC-07 surfaced a drift: `handler.rs:42` logs `peer_addr`, violating D-03. An AC test catches it once; a **clause** formalizes "client IPs must never appear in logs anywhere" so future code can't reintroduce the same pattern under a different AC.

## `/vskit:clause add demo-counter "Client IP addresses must never appear in log lines" --severity=high`

```
$ /vskit:clause add demo-counter "Client IP addresses must never appear in log lines" --severity=high

[clause add] reading docs/features/demo-counter/SPEC.md
[clause add] Applies: includes 'clauses' ✓  (would be added if missing)
[clause add] appending CLA-01 to docs/features/demo-counter/CLAUSES.md
[clause add] running baseline /vskit:clause check demo-counter CLA-01
[clause check] scorer: security-specialist
[clause check] spec check ...
  → PASS (94% confidence)
  Anchored in SPEC §3 AC-07, SPEC §4 Security row, DECISIONS D-03.
[clause check] code check ...
  → FAIL (92% confidence)
  server/click/handler.rs:42 — log::info!(..peer={}, req.peer_addr()) logs peer IP directly.
  server/click/middleware.rs:18 — stores peer_addr in request extensions.
  Top-5 enforcement files written to CLAUSES.md row.

[clause add] CLA-01 created — verdict: FAIL @ 92% (HARD BLOCK per §10.3 v1.8)
```

**Actions taken:**
```
modified  docs/features/demo-counter/SPEC.md (Applies frontmatter — clauses added if missing)
created   docs/features/demo-counter/CLAUSES.md (file scaffold + CLA-01)
appended  docs/worklog/<date>.md (1 row per command)
```

## `/vskit:clause check demo-counter` (after the dev fixes `handler.rs:42`)

```
$ /vskit:clause check demo-counter

[clause check] scorer: security-specialist
[clause check] checking 3 active clauses against current SPEC and code

  CLA-01  "Client IP addresses must never appear in log lines"  [High]
    spec  → PASS  (94%) — anchors unchanged
    code  → PASS  (96%) — handler.rs:42 removed; logger.rs is single chokepoint;
                           tests/click/log_no_pii.rs now green
    verdict transition: FAIL → PASS ✓

  CLA-02  "All campaign strings must be NFC-normalized before any DB write"  [Medium]
    spec  → PASS  (96%) — unchanged
    code  → PASS  (88%) — unchanged
    verdict transition: PASS → PASS

  CLA-03  "Migration M-01 must be idempotent"  [Medium]
    spec  → INDETERMINATE  (55%) — DBSCHEMA.md doesn't mention idempotency explicitly
    code  → PASS  (85%) — migration runner deduplicates via schema_migrations table
    verdict transition: STALE → INDETERMINATE (spec) + PASS (code)
    note: confidence < 60% on spec check → escalates to INDETERMINATE per INV-3.
          Consider /vskit:critique spec to strengthen the spec, or /vskit:clause remove if the
          rule is no longer invariant.

Summary: 2 PASS · 1 INDETERMINATE
Ship-gate effect: SOFT BLOCK (CLA-03 INDETERMINATE — was previously HARD on CLA-01)
exit code: 2
```

**Actions taken:**
```
modified  docs/features/demo-counter/CLAUSES.md (3 rows updated with new checks)
appended  docs/worklog/<date>.md (row 1)
```

## `/vskit:clause list demo-counter --status=fail`

```
$ /vskit:clause list demo-counter --status=fail

No active clauses currently FAIL for demo-counter.

(2 PASS · 1 INDETERMINATE. Use `/vskit:clause list demo-counter` for full list,
 or `/vskit:clause list demo-counter --status=indeterminate` to see CLA-03.)
```

## `/vskit:clause list demo-counter`

```
$ /vskit:clause list demo-counter

Active clauses for demo-counter (3):

  CLA-01  [High]    PASS @ 96%    code 2026-05-26  spec 2026-05-26
          "Client IP addresses must never appear in log lines"

  CLA-02  [Medium]  PASS @ 88%    code 2026-05-26  spec 2026-05-26
          "All campaign strings must be NFC-normalized before any DB write"

  CLA-03  [Medium]  INDETERMINATE code 2026-05-26  spec 2026-05-26
          "Migration M-01 must be idempotent (re-running must be a no-op)"
          ↑ spec check confidence 55% (< 60% INV-3 threshold)

Removed / Superseded: 1 (see CLAUSES.md)
```

## `/vskit:clause update demo-counter CLA-03 "Migration M-01 must be idempotent via the migration runner's dedup"`

```
$ /vskit:clause update demo-counter CLA-03 "Migration M-01 must be idempotent via the migration runner's dedup"

[clause update] moving old CLA-03 row to Removed/Superseded with Supersedes: CLA-04
[clause update] new clause CLA-04 written with updated rule text
[clause update] running baseline /vskit:clause check demo-counter CLA-04

  spec  → PASS  (88%) — runner dedup is referenced in DBSCHEMA.md migrate.rs callout
  code  → PASS  (85%) — runner enforces

[clause update] CLA-03 superseded by CLA-04 (PASS @ 85%)
```

**Why update instead of remove?** The original rule ("must be idempotent") was too strict given the runner architecture. The new rule narrows the invariant to where it's actually enforced. The audit trail in `## Removed / Superseded Clauses` shows what changed and why.

## `/vskit:clause remove demo-counter CLA-04` (hypothetical — if the rule is no longer invariant)

```
$ /vskit:clause remove demo-counter CLA-04

[clause remove] reading current state of CLA-04
  Active record: PASS @ 85% (code) · PASS @ 88% (spec)
Reason for removal (free text, will appear in audit trail): _
```

Confirm with a reason; the row moves to `## Removed / Superseded Clauses` with the final verdict preserved.

## `/vskit:clause audit` (global, read-only)

```
$ /vskit:clause audit

[clause audit] scanning docs/features/ for CLAUSES.md

  ingest         — no CLAUSES.md (clauses not in Applies)
  query          — no CLAUSES.md (clauses not in Applies)
  demo-counter   — 3 active clauses
                   CLA-01: High,   PASS 96%/96%  — OK
                   CLA-02: Medium, PASS 88%/96%  — OK
                   CLA-04: Medium, PASS 85%/88%  — OK
                   (1 row in Removed/Superseded — audit-only)

Summary across repo:
  0 FAIL
  0 INDETERMINATE
  0 stale
  3 clauses passing
  1 historical record (Removed/Superseded)

exit code: 0
```

## `/vskit:clause check-all` (run all checks, write results)

```
$ /vskit:clause check-all

[clause check-all] iterating features with clauses in Applies

  demo-counter (3 clauses) ... 3 PASS  → exit 0

Repos with clauses: 1
Total clauses checked: 3
Aggregated exit code: 0
```

**Aggregation rule:** non-zero exit if **any** feature reports High/Critical FAIL @ confidence ≥ 80%. A single hard-blocking clause anywhere in the repo fails the whole run.

## How clauses fit into the lifecycle

| Phase | Clause action |
|---|---|
| Critique | When a specialist proposes an invariant that can't be testably ACd, raise a clause instead — `/vskit:clause add` from inside the critique flow |
| Implementation | `/vskit:clause check` after each batch of commits to confirm the invariant still holds |
| Ship gate | `/vskit:check deploy` reads CLAUSES.md per feature; High/Critical FAIL = hard block, Medium FAIL or stale = soft block (§10.3 v1.8) |
| Post-ship | `/vskit:clause audit` weekly to catch staleness; `/vskit:clause check-all` after dependency upgrades or major refactors |

---

# Key invariants reinforced across the trace

- **Lifecycle states (Backlog → Shipped) are never hand-edited** — they emerge from TASKS rows, score values, score history. `/vskit:project-status` reads the truth at any moment.
- **Every commit has a `Closes-AC:` trailer**, audited by `/vskit:audit-traceability`. Six months from now, every line walks back to an AC.
- **Every decision has a DECISIONS row whose Updates column is non-empty.** No orphans. Otherwise Documentation score drops and ship is gated.
- **`/vskit:score` is cached** — re-running after a clean diff prints `[cached]`. Re-runs after code/spec changes invalidate.
- **Soft block ≠ block.** `/vskit:deploy` will prompt and accept a waiver, but the waiver is appended to `SCORE.md ## Score History` with date, deployer, and reason. Auditable bypass.
- **Token estimates always prefixed `~`.** `/vskit:report-overhead` shows the budget; two breach weeks force a drop or scope reduction.

That's every command in the spec exercised once, in the order a real adoption flows through them.

---

## Where to go from here

- **Try it on your repo.** [`ADOPTION.md`](./ADOPTION.md) is the under-an-hour tutorial; this file is the reference for what comes after.
- **Inspect a real populated feature folder.** [`example/features/demo-counter/`](./example/features/demo-counter/) holds the same feature this walkthrough simulates, fully filled out.
- **Read the spec.** [`vertical-slices-ai-framework.md`](./vertical-slices-ai-framework.md) §3.1 has the canonical pipeline diagram and §8 has every command contract.
