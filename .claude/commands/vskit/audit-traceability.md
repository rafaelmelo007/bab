---
description: Scan git log for Closes-AC trailers on every non-merge commit. Exit non-zero if any commit lacks one (unless CLAUDE.md declares Traceability aspirational).
argument-hint: [<since-ref>]
---

You are running `/vskit:audit-traceability` per §8.2 + §0.1 of the framework spec at `docs/bundle/vertical-slices-ai-framework.md`.

**Since ref (optional):** `$ARGUMENTS`

Steps:

1. Check `CLAUDE.md` for `Traceability: aspirational` under §Commands → Framework settings. If set, print `[exempt] Traceability declared aspirational in CLAUDE.md — skipping audit` and exit 0.
2. Resolve `<since-ref>`:
   - If `$ARGUMENTS` is non-empty, use it.
   - Else run `git describe --tags --abbrev=0` — if it succeeds, use the tag.
   - Else use `git merge-base HEAD origin/main`.
3. Run `git log --no-merges --format='%H%x09%s%x09%b%x1e' <since>..HEAD` and parse each commit.
4. For each commit, check for a `Closes-AC: <slug>#AC-NN` trailer in the body. Optionally also surface `Decision: <slug>#D-NN` trailers per §4.5.
5. Print a table: `SHA | subject | Closes-AC | Decision | status (OK / MISSING)`.
6. Exit code:
   - 0 if every non-merge commit has a `Closes-AC:` trailer.
   - 1 if any commit is missing one. Print the offending SHAs at the bottom.

Read-only. Writes nothing to disk.
