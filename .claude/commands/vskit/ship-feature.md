---
description: Orchestrator. Chains critique-spec → spec-to-tasks → implement → test → score → prototype (if applicable). Resumable — re-running after a halt skips completed steps.
argument-hint: <feature-slug>
---

You are running `/vskit:ship-feature` per §8.4 of `docs/bundle/vertical-slices-ai-framework.md`.

**Feature slug:** `$ARGUMENTS`

Halt rules: orphan DECISIONS rows after critique; unfinished TASKS rows after implement; failing tests; any scored dim < 7 or security < 8.

Each step's progress is observable on disk — resumable.

1. `/vskit:critique-spec $ARGUMENTS` — halt if any DECISIONS row is left orphaned (no propagation).
2. `/vskit:spec-to-tasks $ARGUMENTS`.
3. `/vskit:implement-feature $ARGUMENTS` — halt if any TASKS row is not `Done` and not blocked by a DEF.
4. `/vskit:test-feature $ARGUMENTS` — halt on test failure.
5. `/vskit:score-feature $ARGUMENTS` — halt if any scored dim < 7 OR security < 8.
6. If SPEC `Applies:` contains `prototype`: `/vskit:prototype-feature $ARGUMENTS`.

On any halt: print the failing step + its output, preserve disk state, exit with the same code. Next run resumes from current observable state.
