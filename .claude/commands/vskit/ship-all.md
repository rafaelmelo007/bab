---
description: For each feature in Spec Ready or Testing, run /vskit:ship-feature. Halts on the first feature that fails.
---

You are running `/vskit:ship-all` per §8.4 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/features/*/SPEC.md`.
2. Compute each feature's lifecycle state per §4.1.
3. Filter to `Spec Ready` and `Testing`.
4. Sort by SPEC frontmatter priority desc.
5. For each, invoke `/vskit:ship-feature <slug>`.
6. Halt on the first failure; preserve disk state; exit the failing step's code.
