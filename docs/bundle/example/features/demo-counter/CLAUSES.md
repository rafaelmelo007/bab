# Clauses — Click Counter

**Feature:** demo-counter
**Source:** /vskit:clause add | /vskit:clause check
**Last updated:** 2026-05-23

> Clauses are invariant rules the feature must hold across the codebase (§4.7).
> Three are active. CLA-01 is currently FAIL — see Drift Findings in SCORE.md.

## Active Clauses

### CLA-01 — Client IP addresses must never appear in log lines

| Field | Value |
|---|---|
| **Severity** | High |
| **Added** | 2026-05-20 |
| **Scorer** | security-specialist |
| **Last spec check** | 2026-05-23 — `PASS` (94% confidence) |
| **Last code check** | 2026-05-23 — `FAIL` (92% confidence) |

**Top 5 enforcement files** *(ordered by relevance)*

1. `server/click/handler.rs` — the request entry point; current FAIL source
2. `server/click/logger.rs` — structured-log wrapper; should be the single chokepoint
3. `server/click/middleware.rs` — adds correlation IDs but currently also captures peer_addr
4. `tests/click/log_no_pii.rs` — currently FAILING test; once green will be enforcement evidence
5. `docs/features/demo-counter/DECISIONS.md` — D-03 is the source of this clause

**Reasoning — last code check**

`server/click/handler.rs:42` calls `log::info!("...peer={}", req.peer_addr())` directly,
bypassing `logger.rs`. The middleware at `middleware.rs:18` also stores `peer_addr` in the
request extensions and the log wrapper at `logger.rs:31` does **not** strip it before emit.
Tests `log_no_pii.rs::no_peer_addr_in_logs` exists but currently fails. Confidence is 92%
(not 100%) only because the scorer could not confirm whether the log call at
`handler.rs:42` is reachable under all code paths — it appears to be unconditional, but
there is one `if cfg!(debug_assertions)` guard nearby that could narrow scope. Either way
the clause as currently written holds across all paths, so the verdict is FAIL.

**Recommended fix:** delete `handler.rs:42`; route all logging through `logger.rs` which
already excludes peer_addr per D-03. Tracked as ACTION-04 in SCORE.md.

**Reasoning — last spec check**

The clause is well-anchored. `SPEC §3 AC-07` requires structured-JSON logging with a
`campaign` field and explicitly never the client IP. `SPEC §4 Security` row reiterates
"no PII in logs." `DECISIONS D-03` captures the rationale (anonymous tracking by design;
logging IP would re-introduce PII this feature avoided). All three citations point at
the same invariant. PASS with 94% confidence — only deduction: AC-07 phrasing says
"never the client IP" but doesn't enumerate other PII (user-agent, geolocation), so a
stricter reading of the clause might require spec tightening in a future revision.

---

### CLA-02 — All campaign strings must be NFC-normalized before any database write

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Added** | 2026-05-20 |
| **Scorer** | security-specialist |
| **Last spec check** | 2026-05-23 — `PASS` (96% confidence) |
| **Last code check** | 2026-05-23 — `PASS` (88% confidence) |

**Top 5 enforcement files**

1. `server/click/validation.rs` — `normalize_campaign()` applies NFC at lines 12–18
2. `server/click/handler.rs` — invokes `normalize_campaign()` at line 28 before any DB call
3. `server/db/repo.rs` — write path; receives already-normalized strings
4. `tests/click/validation/nfc_normalize.rs` — confirms canonical decomposition + composition
5. `docs/features/demo-counter/DECISIONS.md` — D-02 is the source

**Reasoning — last code check**

`validation.rs` exposes one function `normalize_campaign` that calls Unicode NFC via the
`unicode-normalization` crate (pinned 0.1.22). The POST handler at `handler.rs:28` calls
this function before any branch that reaches the DB layer. The DB layer at `repo.rs:14`
accepts a `&str` and performs no further normalization (correctly — single chokepoint).
Tests at `nfc_normalize.rs` cover three confusable input forms and confirm canonical
output. Confidence 88% (not higher) because there is one alternative write path through
`bulk_insert_test_data` in `repo.rs:67` that bypasses the handler — this path is gated
behind `#[cfg(test)]` but if it were ever made public it would skip normalization. Not a
live bug; flagged as a guardrail concern.

**Reasoning — last spec check**

`SPEC §3 AC-03` requires the 64-char cap *after* NFC normalization. `INTERFACE-CONTRACTS.md
POST /click body schema` documents NFC. `DECISIONS D-02` captures the choice. The clause
is fully anchored.

---

### CLA-03 — Migration M-01 must be idempotent (re-running must be a no-op)

| Field | Value |
|---|---|
| **Severity** | Medium |
| **Added** | 2026-05-08 |
| **Scorer** | db-architect *(overrides default — clause is schema-shaped)* |
| **Last spec check** | 2026-05-08 — `PASS` (90% confidence) |
| **Last code check** | 2026-05-08 — `PASS` (85% confidence) — **STALE (15 days)** |

**Top 5 enforcement files**

1. `server/db/migrations/20260525_clicks.sql` — uses `CREATE TABLE` (not `IF NOT EXISTS`)
2. `server/db/migrate.rs` — migration runner; tracks applied migrations in `schema_migrations`
3. `tests/db/migration_idempotency.rs` — runs M-01 twice in a test
4. `docs/features/demo-counter/DBSCHEMA.md` — Up/Down steps, back-compat assertion
5. `docs/features/demo-counter/DECISIONS.md` — D-04 (Down migration is acceptable)

**Reasoning — last code check (stale)**

The migration runner deduplicates by checking `schema_migrations`, so M-01 cannot run
twice via the normal path. However, if an operator runs the raw `.sql` against the DB
the second invocation fails because `CREATE TABLE` is not idempotent without `IF NOT
EXISTS`. The clause as stated requires idempotency, so a stricter reading says FAIL.
The 2026-05-08 check accepted that the runner's dedup is sufficient and rated PASS at
85%. This check is now 15 days old and is **stale** per §4.7 — counts as
INDETERMINATE for ship-gate purposes. Re-run `/vskit:clause check demo-counter CLA-03`.

**Reasoning — last spec check (stale)**

`DBSCHEMA.md §Migrations M-01` defines Up/Down steps and the back-compat assertion, but
does not explicitly say "idempotent." `DECISIONS D-04` doesn't either. The clause is
under-anchored in the spec — a future `/vskit:critique spec` round should either remove this
clause or strengthen the spec to mention idempotency explicitly.

---

## Removed / Superseded Clauses

| ID | Date | Reason | Final verdict (spec / code) | Supersedes |
|----|------|--------|----------------------------|-------------|
| CLA-00 | 2026-05-19 | Replaced by CLA-01 (broader: "any PII" → "client IPs"; narrower scope is testable) | INDETERMINATE 55% / FAIL 70% | — |

## Current ship-gate impact

| Clause | Severity | Verdict (code) | Confidence | Gate effect |
|---|---|---|---|---|
| CLA-01 | High | FAIL | 92% | **HARD BLOCK** (§10.3 v1.8 rule) |
| CLA-02 | Medium | PASS | 88% | none |
| CLA-03 | Medium | stale | — | **SOFT BLOCK** (§10.3 v1.8 stale rule) |

`/vskit:check deploy` for demo-counter will fail with exit 1 until CLA-01 is fixed (or downgraded
to Medium with rationale, or removed with a written reason).

## How to maintain this file

| Action | Command |
|---|---|
| Add a new clause | `/vskit:clause add demo-counter "<rule>" --severity=high` |
| Re-check one clause | `/vskit:clause check demo-counter CLA-01` |
| Re-check all clauses | `/vskit:clause check demo-counter` |
| Edit rule text or severity | `/vskit:clause update demo-counter CLA-NN "<new rule>"` |
| Remove a clause | `/vskit:clause remove demo-counter CLA-NN` |
| List active clauses | `/vskit:clause list demo-counter` |
