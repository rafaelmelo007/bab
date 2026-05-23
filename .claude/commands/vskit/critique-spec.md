---
description: Interrogate a feature SPEC.md for weak ACs, missing NFRs, edge cases — appends D-NN rows to DECISIONS.md and propagates changes per §4.5.
argument-hint: <feature-slug>
---

You are running `/vskit:critique-spec` per §8.2 of the framework spec at `docs/bundle/vertical-slices-ai-framework.md`.

**Target feature:** `$ARGUMENTS`

Steps:

1. Read `docs/features/$ARGUMENTS/SPEC.md`, `TASKS.md`, `DECISIONS.md`, `SCORE.md` (and `DBSCHEMA.md`, `INTERFACE-CONTRACTS.md`, `CLAUSES.md` if present).
2. Open the framework spec and follow §4.5 (DECISIONS propagation contract) + §2.1 (specialist lenses) verbatim. Run the relevant specialists in parallel via the Agent tool — each scores 0–10 on its lens and surfaces concrete weaknesses.
3. For every decision reached this round:
   - Append a `D-NN` row to `DECISIONS.md` with rationale + chosen option.
   - **Propagate the change to the canonical file in the same run** (SPEC §3/§4/§9, or DBSCHEMA.md / INTERFACE-CONTRACTS.md as relevant). Per INV-3, unresolved items become `DEF-NN` rows — never silently dropped.
4. Set the SPEC frontmatter `Prototype:` field if the critique surfaced UX risk that warrants one.
5. Print a short summary at the end: rows added, files touched, open `DEF-NN` items.

Do not write code. Do not modify TASKS.md (that's `/vskit:spec-to-tasks`'s job).
