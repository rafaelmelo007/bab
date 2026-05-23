---
description: Regenerate docs/prototypes/index.html from all feature prototype folders.
---

You are running `/vskit:gen-prototype-index` per §6 + §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/features/*/prototypes/index.html`.
2. Generate `docs/prototypes/index.html` — a flat list with one link per feature prototype, grouped by feature state (Spec Ready, Testing, Shipped).
3. Reference §6.3 for the reverse-proxy block if the prototypes need external exposure.
