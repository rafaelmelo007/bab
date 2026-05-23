# Score — Click Counter
**Feature:** demo-counter
**Last scored:** 2026-05-23
**last_scored_sha:** 0e9c2a4f1b7d8e6c5a3f2b1d9e8c7a6b5d4f3e2c

## Scores

| Dimension | Score | Scorer | Notes |
|-----------|-------|--------|-------|
| Documentation | 9 | prompt-engineer | All 10 SPEC sections present, all ACs verifiable, all DECISIONS rows have non-empty Updates, both Open Questions resolved |
| Test Coverage | 6 | testing-lead | TC-01..TC-03 implemented; TC-04 in progress (T-08); TC-05 not started (T-09). AC-07 has no test row at all — gap. |
| Module Clarity | 8 | backend-lead | Single `server/click/` module, clean boundary. Rate limiter coupling to clock is shimmed for testability. ≤1 minor defect (the in-memory bucket leaks if process recycles mid-window, documented in §10). |
| Requirements Coverage | 9 | product-owner | Every PRD §2 metric and F-03 line maps to ≥1 SPEC AC. |
| Logging | 5 | devops-lead | T-06 In Progress — structured logging not yet wired. AC-07 not met. |
| Error Handling | 8 | backend-lead | 400 / 429 / 200 / 204 paths covered with named errors. Generic 500 fallback present. ≤1 minor: 500 messages are not user-friendly (internal-only endpoint, acceptable). |
| Security | 8 | security-specialist | Input validation, rate limit, no PII in logs (pending T-06), no auth-by-design (D-05). One minor: rate limiter is per-instance (D-01) so a leaked URL hammered across instances multiplies effective limit; documented and accepted for v1. |
| NFR Compliance | 6 | perf-specialist | Quotas enforced. Latency budget not yet measured — T-10 load test not started. p95 < 50 ms is unverified. |

**Composite:** 7.4 / 10
**Composite formula:** arithmetic mean of the **scored** dimensions (any dimension marked `N/A` per §7.1 is excluded from both numerator and denominator; Security is never N/A as of v1.7), rounded to 1 decimal place. The "no scored dimension < 7" floor and "security ≥ 8" rule are evaluated **independently** of the composite — a high mean cannot mask a weak dimension.
**Ship gate:** every scored dimension ≥ 7 · composite ≥ 8.0 · security ≥ 8 (see §10.3 for hard-block vs soft-block tiers)

> **Gate status: HARD BLOCK (v1.8).** Composite 7.4 < 8.0 (soft); Logging (5) and Test Coverage (6) and NFR (6) below 7 floor (soft); Security at 8 (clears independent floor). **Plus:** CLAUSES.md `CLA-01` (High severity) is FAIL with 92% confidence — that's a hard block under §10.3 v1.8. CLA-03 is stale (>14 days) which adds a soft block. Fix CLA-01 (delete `handler.rs:42` peer_addr log) to clear the hard floor, then re-score to drop the soft block.

## Drift Findings

- AC-07: `server/click/handler.rs:42` logs full request including `req.peer_addr()`. Violates D-03. Filed as part of T-06.
- **CLA-01:** same root cause as AC-07. Will clear when ACTION-04 lands.
- **CLA-03:** stale clause (last code-check 2026-05-08). Run `/vskit:clause check demo-counter CLA-03` to refresh.

## Score History

| Date | Composite | Trigger | Notes |
|------|-----------|---------|-------|
| 2026-05-19 | 2.1 | initial scoring after critique round 1 | SPEC done, no code |
| 2026-05-21 | 5.8 | scoring after T-01..T-05 merged | endpoints + rate limiter live, no tests |
| 2026-05-23 | 7.4 | scoring after T-06 (in-progress) + T-08 (in-progress) | logging halfway done, tests halfway done |

## Improvement Actions

- [ ] ACTION-01: Logging — finish T-06 to wire structured logs with `campaign` field, scrub IPs. Owner: devops-lead. Lifts Logging 5→8.
- [ ] ACTION-02: Test Coverage — finish T-08 (TC-04 concurrency test) and T-09 (TC-05 E2E). Owner: testing-lead. Lifts Test Coverage 6→9.
- [ ] ACTION-03: NFR — run T-10 load test, confirm p95 < 50 ms at 200 rps. Owner: perf-specialist. Lifts NFR 6→9.
- [ ] ACTION-04: Drift — fix `server/click/handler.rs:42` to drop peer_addr from the log line. Owner: backend-lead. Closes the AC-07 drift finding listed above.
