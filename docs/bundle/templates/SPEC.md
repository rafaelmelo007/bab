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
