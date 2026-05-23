# Tasks — REPL Shell

**Feature:** repl-shell
**Source:** SPEC.md, DECISIONS.md
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Pick implementation language + readline lib; record as D-01, D-02 | backend-lead | High | Pending | AC-01, AC-08 | — |
| T-02 | Scaffold project (cargo init / go mod / poetry), wire CI to build the binary | backend-lead | High | Pending | AC-01 | — |
| T-03 | Implement REPL loop + prompt-prefix renderer | backend-lead | High | Pending | AC-01, AC-02 | — |
| T-04 | Implement slash dispatcher + `/help`, `/clear`, `/exit`, unknown-command handling | backend-lead | High | Pending | AC-03, AC-04, AC-05, AC-09 | — |
| T-05 | Signal handling: Ctrl-D exit, Ctrl-C cancel-line | backend-lead | High | Pending | AC-06, AC-07 | — |
| T-06 | Persistent history file under platform config dir | backend-lead | Medium | Pending | AC-08 | — |
| T-07 | Unit tests TC-01..TC-03 | testing-lead | High | Pending | AC-01..AC-09 | — |
| T-08 | Integration tests TC-04..TC-06 via pty harness (Unix + Windows) | testing-lead | High | Pending | AC-03..AC-07 | — |
| T-09 | Accessibility pass: `NO_COLOR` env var honored; no stray ANSI on dumb terminals | ux-specialist | Medium | Pending | §4 Accessibility row | — |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
