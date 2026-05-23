---
description: Extract feature list from a promoted PRD; create docs/features/<slug>/ stub folders with templated SPEC, TASKS, SCORE, DECISIONS, DBSCHEMA, INTERFACE-CONTRACTS.
argument-hint: <prd-path>
---

You are running `/vskit:prd-to-features` per §8.1 of `docs/bundle/vertical-slices-ai-framework.md`.

**PRD path:** `$ARGUMENTS`

1. Read the PRD §6 (Features & Epics).
2. For each feature, create `docs/features/<slug>/` and copy templates from `docs/bundle/templates/`:
   - SPEC.md (set frontmatter `Applies:` per §4.2.1 based on feature type)
   - TASKS.md
   - SCORE.md
   - DECISIONS.md
   - DBSCHEMA.md (stub) if `dbschema` in Applies
   - INTERFACE-CONTRACTS.md (stub) if `interface-contracts` in Applies
3. Pre-populate SPEC §1 (problem) + §2 (scope) from the PRD's feature description. Leave §3 ACs as TODO — those come from `/vskit:critique-spec`.
4. Print the list of created folders.
