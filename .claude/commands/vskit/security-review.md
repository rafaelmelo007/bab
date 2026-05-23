---
description: security-specialist audits the full codebase. Findings become incidents/ entries.
---

You are running `/vskit:security-review` per §8.2 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Invoke `security-specialist` via Agent against the full codebase (focus on the diff since the last security review if one is recorded in `docs/incidents/`).
2. Print the security report.
3. For each finding ≥ Medium severity, create `docs/incidents/<YYYY-MM-DD>-<slug>.md` with: severity, location, reproduction, recommendation, links to the affected feature(s).
4. Reference any incident IDs in the affected feature's `docs/features/<slug>/SPEC.md` §10.4 (INC↔SPEC link).
