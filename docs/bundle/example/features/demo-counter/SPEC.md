# Click Counter — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** Medium
**Applies:** [dbschema, interface-contracts, clauses]
**Touches:** [`server/click/**`, `server/db/migrations/202*_clicks.sql`]
**Prototype:** N/A
**Agents:** backend-lead, db-architect, security-specialist, testing-lead
**Source:** docs/PRD.md §6 — F-03 Click Counter
**Last updated:** 2026-05-23
**Score:** See SCORE.md

---

## §1 Problem Statement

Marketing wants to embed a one-pixel tracking link in outbound emails and know how many recipients clicked, broken down by campaign. They currently don't know — open-rate data from the email vendor is too coarse. This feature gives them an internal endpoint they control, with no third-party tracker, and no PII stored.

## §2 Scope

### In Scope
- `POST /click` — record one click for a campaign string supplied in the URL or body.
- `GET /click/:campaign` — return total count for a single campaign.
- Storage in the existing Postgres instance.
- Rate limiting on `POST /click` to keep a leaked URL from filling the table.

### Out of Scope
- Per-user click attribution (PII risk, not requested).
- Time-windowed queries (`?since=…`) — defer to v2 once marketing confirms it's needed.
- Bulk-import of historical clicks — they don't exist; nothing to import.
- A UI to view results — marketing already has a BI tool that can read the table directly.

## §3 Acceptance Criteria

- [x] AC-01: `POST /click` with `campaign=spring_promo` increments the count for `spring_promo` by 1 and returns `204 No Content`.
- [x] AC-02: `POST /click` with no campaign returns `400 Bad Request` with body `{"error":"campaign required"}`.
- [x] AC-03: Campaign strings longer than 64 characters return `400 Bad Request`. *(see DECISIONS D-02)*
- [x] AC-04: `POST /click` enforces a per-IP rate limit of 60 requests/minute. The 61st request in a rolling minute returns `429 Too Many Requests`. *(see DECISIONS D-01)*
- [x] AC-05: `GET /click/:campaign` returns `{"campaign":"spring_promo","count":N}` with `200 OK`.
- [x] AC-06: `GET /click/:campaign` for an unseen campaign returns `{"campaign":"<name>","count":0}` with `200 OK` (no 404 — clicks not arriving is a valid state).
- [ ] AC-07: All AC behavior is logged structured-JSON with a `campaign` field, never the client IP. *(see DECISIONS D-03)*
- [ ] AC-08: Schema migration M-01 has both an Up and a Down script in DBSCHEMA.md. *(see DECISIONS D-04)*

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | < 50 ms at 200 rps (single-instance, in-region) |
| Error budget | < 0.1% 5xx over 30 days |
| Browser support | N/A — server-side endpoint, no browser code |
| Quota enforcement | 60 req/min/IP on POST; no limit on GET |
| Accessibility | N/A — no UI |
| Security | No auth required on POST (intentional, see D-05); strict input validation; rate-limited; no PII in logs |

## §5 Data Model

> Schema lives in **DBSCHEMA.md** (single source of truth). Do not restate tables, columns, or indexes here.
> Link: ./DBSCHEMA.md

## §6 Interface Contracts

> Contracts live in **INTERFACE-CONTRACTS.md** (single source of truth). Do not restate endpoints, payloads, or WS events here.
> Link: ./INTERFACE-CONTRACTS.md

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit | Campaign validation: length, charset, empty | Returns 400 on invalid; passes through on valid |
| TC-02 | Unit | Rate-limit window math | 60 req in window passes; 61st rejected; state expires after 60s |
| TC-03 | Integration | POST then GET round-trip | Count reflects N posts |
| TC-04 | Integration | Rate limiter under concurrency | No double-count or under-count at 100 concurrent clients |
| TC-05 | E2E | Email tracking pixel hit pattern | 1000 sequential pixel loads yield count of 1000 |

## §8 Cross-References
- **PRD:** docs/PRD.md §6 — F-03 Click Counter
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **DB Schema:** [DBSCHEMA.md](./DBSCHEMA.md)
- **Interface Contracts:** [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Clauses:** [CLAUSES.md](./CLAUSES.md)  *(3 active; CLA-01 currently FAIL — see ship-gate impact)*
- **Blocked-by:** []

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | Should we expose total-across-all-campaigns as a third endpoint? | product-owner | Resolved | No — BI tool reads the table directly. |
| Q-02 | Do we accept campaign names with non-ASCII characters? | security-specialist | Resolved | Yes, after Unicode normalization (NFC). Captured in D-02. |

## §10 Implementation Notes

- The rate limiter uses an in-memory token bucket. On multi-instance deploys this becomes per-instance, which is acceptable for v1 (D-01). A Redis-backed shared bucket is a v2 candidate.
- The `campaign` column is indexed. The query plan for `GET /click/:campaign` must hit the index, not seq-scan. Confirmed in M-01 with `EXPLAIN`.
- No `DELETE` endpoint. Pruning old campaigns happens via a separate scheduled job tracked in feature `click-pruner`, which is not yet built.
