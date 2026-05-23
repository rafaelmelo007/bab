---
description: Run check-deploy first; refuses on hard-block; on soft-block prompts user; appends waiver rows; then runs the repo's deploy shell command.
---

You are running `/vskit:deploy` per §10.3 + §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

This command is **repo-overridable for the shell invocation only** — `/vskit:check-deploy` (which it always runs first) is framework-owned and MUST run unmodified.

1. Run `/vskit:check-deploy`.
   - Exit 1 (hard-block) → refuse. Print failing features. Stop.
   - Exit 2 (soft-block) → prompt the user: `N features below ship gate. Deploy anyway? [y/N]`. On `y`, append a waiver row to each failing feature's SCORE.md `## Score History`. On `n`, stop.
   - Exit 0 → proceed.
2. Read `CLAUDE.md` row for `/vskit:deploy` to get the shell invocation. If TBD, refuse.
3. Run the shell command via Bash.
4. Exit with the shell command's exit code.
