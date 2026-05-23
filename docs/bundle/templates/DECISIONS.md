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
