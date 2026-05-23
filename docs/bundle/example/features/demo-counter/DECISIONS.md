# Decisions — Click Counter

**Feature:** demo-counter
**Source:** /vskit:critique spec demo-counter sessions
**Last updated:** 2026-05-23

> This file is the audit trail for design decisions made during critique rounds.
> The decisions themselves live in SPEC.md / DBSCHEMA.md / INTERFACE-CONTRACTS.md.
> If you change a decision later, append a new row with `Supersedes: D-NN` — never edit history.

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-19 | security-specialist | Rate-limit storage: in-memory or Redis? | In-memory token bucket, per-instance | Single-instance launch; Redis would add a dependency for a feature marketing may sunset in 6 months; v2 candidate if multi-instance is needed | SPEC.md §3 AC-04, §4 Quota row, §10 note 1 | — |
| D-02 | 2026-05-19 | security-specialist | Max campaign-name length? | 64 chars after Unicode NFC normalization | Caps row size; prevents log-blowup attacks; NFC stops homoglyph-driven duplicate campaigns | SPEC.md §3 AC-03, §9 Q-02; INTERFACE-CONTRACTS.md POST /click body schema | — |
| D-03 | 2026-05-20 | security-specialist | What goes in logs? | `campaign`, timestamp, status code. NEVER client IP, user-agent, or request body beyond `campaign`. | Click endpoints are anonymous by design; logging IP would re-introduce the PII this feature avoided | SPEC.md §3 AC-07, §4 Security row | — |
| D-04 | 2026-05-20 | db-architect | Is a Down migration required? | Yes. `DROP TABLE clicks; DROP INDEX …`. Acceptable because the table starts empty and is one-way append-only — drop is the rollback. | Spec §4.6 forbids one-way migrations without explicit justification | DBSCHEMA.md ## Migrations M-01 | — |
| D-05 | 2026-05-21 | product-owner | Auth required on POST /click? | No — it's a public tracking endpoint embedded in email pixels. Rate-limit is the abuse control. | Auth would defeat the use case (recipients have no creds); the URL is the bearer; campaign string is treated as untrusted input | SPEC.md §4 Security row; INTERFACE-CONTRACTS.md POST /click auth field | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | Per-tenant rate limits | Single-tenant launch | A multi-tenant epic opens |
| DEF-02 | Time-windowed query (`?since=…`) | Marketing hasn't asked; YAGNI | Marketing files a feature request |
| DEF-03 | Redis-backed shared rate-limit bucket | Single-instance v1 (D-01) | Multi-instance scale-out happens |
