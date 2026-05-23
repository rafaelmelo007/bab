# Tasks — Click Counter

**Feature:** demo-counter
**Source:** SPEC.md, DECISIONS.md
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Add `clicks` table + index migration M-01 | db-architect | High | Done | AC-01, AC-05, AC-08 | — |
| T-02 | Implement `POST /click` handler with input validation | backend-lead | High | Done | AC-01, AC-02 | — |
| T-03 | Implement `GET /click/:campaign` handler | backend-lead | High | Done | AC-05, AC-06 | — |
| T-04 | Implement campaign-length cap at 64 chars + Unicode NFC | backend-lead | Medium | Done | AC-03 | D-02 |
| T-05 | Implement per-IP rate limiter (60/min, in-memory token bucket) | backend-lead | High | Done | AC-04 | D-01 |
| T-06 | Add structured logging with `campaign` field; scrub IPs | devops-lead | Medium | In Progress | AC-07 | D-03 |
| T-07 | Write Down migration for M-01 (drop table + index) | db-architect | Medium | In Review | AC-08 | D-04 |
| T-08 | Unit + integration tests (TC-01..TC-04) | testing-lead | High | In Progress | AC-01..AC-06 | — |
| T-09 | E2E test simulating tracking pixel load (TC-05) | testing-lead | Medium | Pending | AC-01, AC-05 | — |
| T-10 | Load test confirming p95 < 50 ms at 200 rps | perf-specialist | Low | Pending | NFR row 1 | — |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
