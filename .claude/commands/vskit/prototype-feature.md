---
description: UX specialist generates an HTML prototype from SPEC.md §3 ACs.
argument-hint: <feature-slug>
---

You are running `/vskit:prototype-feature` per §6 + §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

**Feature slug:** `$ARGUMENTS`

1. Confirm SPEC frontmatter has `prototype` in `Applies:`. If not, refuse and tell the user to run `/vskit:critique-spec` first to set it.
2. Read SPEC §3 ACs.
3. Invoke `ux-specialist` via Agent to generate `docs/features/$ARGUMENTS/prototypes/index.html` — a static HTML mock walking through each AC's happy path + key edge case.
4. Print the local path. Reference §6.3 if the user wants to expose it via reverse proxy.
