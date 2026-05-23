---
description: Aggregate all unresolved §9 Open Questions from all feature SPECs. Sorted by feature and owner.
---

You are running `/vskit:open-questions` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/features/*/SPEC.md`.
2. Parse §9 Open Questions section from each.
3. Group by feature, then sort by owner, then by age (oldest first).
4. Print: feature | Q-id | summary | owner | due | days-open.
5. Write nothing to disk.
