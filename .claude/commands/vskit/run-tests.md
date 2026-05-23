---
description: Full test suite (unit + integration + e2e). Test report; SCORE.md test-coverage updated for touched features.
---

You are running `/vskit:run-tests` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

This command is **repo-overridable** — its shell invocation comes from `CLAUDE.md` §Commands → "Repo-Specific Overrides" table.

1. Read `CLAUDE.md` and find the row for `/vskit:run-tests`. If still TBD (current state — language not chosen yet per `repl-shell` SPEC §9 Q-01), refuse and tell the user to set it.
2. Run the shell command via Bash.
3. For each touched feature (intersect failing/passing tests with each feature's SPEC `Touches:` paths), update `docs/features/<slug>/SCORE.md` §test-coverage.
4. Exit with the shell command's exit code.
