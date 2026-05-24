---
description: End-to-end tests only. Screenshots on failure to docs/testing/e2e-<date>/.
---

You are running `/vskit:run-e2e` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

This command is **repo-overridable** — its shell invocation comes from `CLAUDE.md` §Commands.

1. Read CLAUDE.md row for `/vskit:run-e2e`. If TBD, refuse.
2. Run the shell command. For `ulm`, this will likely be the pty-harness suite once it exists.
3. On failure, save screenshots/transcripts to `docs/testing/e2e-$(date +%Y-%m-%d)/`.
4. Exit with the shell command's exit code.
