---
description: Hit health endpoints for the app and all service dependencies.
---

You are running `/vskit:health-check` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

This command is **repo-overridable**. For `ulm` it's marked **N/A** in CLAUDE.md — ulm is an interactive CLI with no health endpoint.

1. Read CLAUDE.md row for `/vskit:health-check`. If N/A, print `Not applicable for this repo (interactive CLI, no health endpoint)` and exit 0.
2. Otherwise, run the shell command and print the status table.
