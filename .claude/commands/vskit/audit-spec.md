---
description: Audit all SPEC.md files for §4.3 completeness, Touches correctness, and §10.4 INC↔SPEC conflicts. Exit non-zero on any warning.
---

You are running `/vskit:audit-spec` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/features/*/SPEC.md`.
2. For each SPEC, check:
   a. **§4.3 section completeness** — all canonical sections (§1 Problem, §2 Scope, §3 ACs, §4 NFRs, §5 Data Model if Applies, §6 Interface Contracts if Applies, §7 Test Spec, §8 Cross-Refs, §9 Open Questions, §10 Impl Notes) present and non-empty.
   b. **Touches correctness** — every pathspec resolves to ≥1 file; `git log --name-only <last_scored_sha>..HEAD` for `Closes-AC: <slug>#…` commits did not touch files outside Touches (stale pathspec → silent cache miss / false-clean).
   c. **§10.4 INC↔SPEC conflicts** — any open `docs/incidents/*` entry referencing this feature whose ACs the SPEC doesn't reflect.
3. Print gap report; exit non-zero on any warning.
