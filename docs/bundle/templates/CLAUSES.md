# Clauses — <Feature Name>

**Feature:** <slug>
**Source:** /vskit:clause add | /vskit:clause check
**Last updated:** YYYY-MM-DD

> Clauses are invariant rules the feature must hold across the codebase (§4.7).
> Unlike ACs (testable per turn) and NFRs (measured per release), clauses are
> AI-graded with confidence. Read §4.7 before adding a clause; clauses are
> reserved for properties that cannot be cleanly expressed as a single test.

## Active Clauses

### CLA-01 — <one declarative sentence stating the rule>

| Field | Value |
|---|---|
| **Severity** | Medium  *(Low \| Medium \| High \| Critical)* |
| **Added** | YYYY-MM-DD |
| **Scorer** | security-specialist  *(override only when the rule is not security-shaped)* |
| **Last spec check** | YYYY-MM-DD — `PASS` (XX% confidence) |
| **Last code check** | YYYY-MM-DD — `PASS` (XX% confidence) |

**Top 5 enforcement files** *(ordered by relevance)*

1. `path/to/file.ext` — *why this file matters to the clause*
2. `path/to/another.ext` — *...*
3. `path/to/third.ext` — *...*
4. `path/to/fourth.ext` — *...*
5. `path/to/fifth.ext` — *...*

**Reasoning — last code check**

<one paragraph: what the scorer found in the code, where the enforcement points
are, what (if anything) gives them less than full confidence. Be specific —
name lines and conditions, not "looks good".>

**Reasoning — last spec check**

<one paragraph: where the clause's requirement is anchored in SPEC/DBSCHEMA/
INTERFACE-CONTRACTS/DECISIONS. If the spec doesn't mention it, that itself is
a finding — clauses with no spec anchor should be raised to /vskit:critique spec.>

---

### CLA-02 — <next clause>

*(same structure)*

---

## Removed / Superseded Clauses

| ID | Date | Reason | Final verdict (spec / code) | Supersedes |
|----|------|--------|----------------------------|-------------|
| CLA-00 | YYYY-MM-DD | Merged into CLA-01 (broader scope) | PASS 89% / PASS 84% | — |

> **Why this table exists:** clauses cannot be silently deleted (§4.7). Removal
> preserves the final verdict and the reason. If a clause was updated rather
> than removed, the old row lives here with `Supersedes: CLA-NN` pointing at
> its replacement.

## How to maintain this file

| Action | Command |
|---|---|
| Add a new clause | `/vskit:clause add <slug> "<rule>" --severity=<low\|medium\|high\|critical>` |
| Re-check one clause | `/vskit:clause check <slug> CLA-NN` |
| Re-check all clauses | `/vskit:clause check <slug>` |
| Edit rule text or severity | `/vskit:clause update <slug> CLA-NN "<new rule>"` |
| Remove a clause | `/vskit:clause remove <slug> CLA-NN` |
| List active clauses | `/vskit:clause list <slug>` |

Clauses with `Last code check` older than 14 days are **stale** and count as
INDETERMINATE for ship-gate purposes (soft block) per §4.7.
