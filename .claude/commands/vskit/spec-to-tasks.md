---
description: Break SPEC.md ACs into TASKS.md implementation rows. Decision column populated from DECISIONS.md.
argument-hint: <feature-slug>
---

You are running `/vskit:spec-to-tasks` per §8.2 + §4.4 of `docs/bundle/vertical-slices-ai-framework.md`.

**Feature slug:** `$ARGUMENTS`

1. Read `docs/features/$ARGUMENTS/SPEC.md` (§3 ACs, §4 NFRs, §6 Interface Contracts, §10 Implementation Notes) and `DECISIONS.md`.
2. For each AC, decompose into 1–N tasks. Set owner, priority, status=Pending.
3. If a task exists because of a D-NN decision, populate the `Decision:` column with the D-NN ID.
4. Write tasks as rows in `docs/features/$ARGUMENTS/TASKS.md` per the §4.4 template.
5. Print the new task count and the first 3 highest-priority rows.
