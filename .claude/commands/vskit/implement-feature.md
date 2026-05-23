---
description: Implement all Pending TASKS.md rows per the SPEC. Commits carry Closes-AC and (when applicable) Decision trailers.
argument-hint: <feature-slug>
---

You are running `/vskit:implement-feature` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

**Feature slug:** `$ARGUMENTS`

1. Read `docs/features/$ARGUMENTS/{SPEC,TASKS,DECISIONS,DBSCHEMA,INTERFACE-CONTRACTS,CLAUSES}.md` (the ones that exist).
2. For each Pending TASKS row in priority order:
   a. Implement the code change per the SPEC AC the task closes.
   b. Update TASKS row status to `In Progress` → `Done`.
   c. Commit with trailers:
      `Closes-AC: <slug>#AC-NN`
      `Decision: <slug>#D-NN` (only if the task has a Decision column)
3. Halt if any AC is ambiguous — surface as a `DEF-NN` in DECISIONS.md and ask the user instead of guessing.
4. Print the list of commits made.
