---
description: Recommend the single highest-priority unblocked task across all features.
---

You are running `/vskit:next-task` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/features/*/TASKS.md` + `DECISIONS.md`.
2. Filter to Pending rows.
3. Exclude tasks blocked by open `DEF-NN` items in their feature's DECISIONS.md.
4. Rank by feature priority desc, then task priority desc.
5. Print one paragraph: chosen task, feature, why it's next, what command to run (usually `/vskit:implement-feature <slug>` scoped to that task).
