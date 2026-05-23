# Score — <Feature Name>
**Feature:** <slug>
**Last scored:** YYYY-MM-DD
**last_scored_sha:** <git rev-parse HEAD at scoring time>  *(populated by /score; freshness gate in §10.3)*

## Scores

| Dimension | Score | Scorer | Notes |
|-----------|-------|--------|-------|
| Documentation | 0 | prompt-engineer | |
| Test Coverage | 0 | testing-lead | |
| Module Clarity | 0 | backend-lead (+ frontend-lead if ux/client/) | |
| Requirements Coverage | 0 | product-owner | |
| Logging | 0 | devops-lead | |
| Error Handling | 0 | backend-lead | |
| Security | 0 | security-specialist | |
| NFR Compliance | 0 | perf-specialist | |

**Composite:** 0.0 / 10
**Composite formula:** arithmetic mean of the **scored** dimensions (any dimension marked `N/A` per §7.1 is excluded from both numerator and denominator; Security is never N/A as of v1.7), rounded to 1 decimal place. The "no scored dimension < 7" floor and "security ≥ 8" rule are evaluated **independently** of the composite — a high mean cannot mask a weak dimension.
**Ship gate:** every scored dimension ≥ 7 · composite ≥ 8.0 · security ≥ 8 (see §10.3 for hard-block vs soft-block tiers)

## Drift Findings
[Populated by /vskit:score feature when code diverges from SPEC §3 ACs.
Format: `AC-<N>: <file>:<line> — <description>`]

## Score History

| Date | Composite | Trigger | Notes |
|------|-----------|---------|-------|

> Appended by `/vskit:score feature`. Per INV-1, consecutive identical rows (same Composite AND same Trigger) collapse: the most recent row's Date column becomes the range `<first>..<last>` instead of duplicating. A `/vskit:score` run that produces a [cached] result (§8.2) does NOT append a row — the prior row's range extends instead.

## Improvement Actions

- [ ] ACTION-01: [Dimension] — [What to fix] — Owner: [agent]
