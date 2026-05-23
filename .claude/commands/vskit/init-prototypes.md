---
description: Conditional sub-init when a feature adds 'prototype' to Applies. Creates index skeleton, htpasswd, and prints proxy block.
---

You are running `/vskit:init-prototypes` per §6 + §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. If `docs/prototypes/index.html` exists, skip skeleton creation.
2. Otherwise create the skeleton + a placeholder header.
3. Prompt for: `<app-name>` slug, basic-auth username.
4. Generate the htpasswd file at `<proxy-secrets-dir>/htpasswd/<app>-prototypes` (the user will be prompted for the secrets dir if not set).
5. Print the §6.3 reference reverse-proxy block to stdout for the operator to paste into the proxy config (do not write to a proxy config file directly).
