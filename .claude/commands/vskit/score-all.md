---
description: Run /vskit:score-feature for every folder in docs/features/. Honors the per-feature cache rule.
---

You are running `/vskit:score-all` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/features/*/` (skip top-level README.md).
2. For each feature slug, invoke `/vskit:score-feature <slug>` (cache rule applies — clean diffs skip work).
3. Print a summary table at the end: slug | composite | delta-since-last | cached?

Side effect: each run may update individual SCORE.md files.
