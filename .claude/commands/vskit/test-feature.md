---
description: Run tests scoped to one feature. Report failures and update SCORE.md test-coverage dimension.
argument-hint: <feature-slug>
---

You are running `/vskit:test-feature` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

**Feature slug:** `$ARGUMENTS`

1. Read `docs/features/$ARGUMENTS/SPEC.md` §7 Test Specification to discover the test scope (paths, suite names).
2. Run the project's test command (from CLAUDE.md §Commands `/vskit:run-tests` override) filtered to the feature's scope.
3. Print per-AC pass/fail.
4. Update `docs/features/$ARGUMENTS/SCORE.md` §test-coverage dimension with current coverage and pass rate.
5. Exit non-zero on any failure.
