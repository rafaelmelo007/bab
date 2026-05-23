---
description: One-shot scaffolder for a new repo. Creates docs/ tree, writes CLAUDE.md stub, installs Stop hook, offers pre-push hook. Idempotent.
---

You are running `/vskit:init-framework` per §8.2 + §5.2.1 of `docs/bundle/vertical-slices-ai-framework.md`.

> **Framework-owned.** Per §9, this command MUST NOT be redefined.

1. Create the §1 canonical doc tree (idempotent — skip dirs that exist):
   `docs/{prds/draft, features, worklog, prototypes, incidents, process, technical, bundle}`
2. Touch `docs/{prds,features,worklog,prototypes,incidents}/README.md` if missing.
3. Touch `docs/technical/{ARCHITECTURE,ENV}.md` with the stubs from ADOPTION.md §Step 2.
4. Copy `docs/bundle/templates/PRD.md` to a top-level PRD.md stub if none exists.
5. Write `CLAUDE.md` §Commands stub from `docs/bundle/templates/CLAUDE.md-snippet.md` if not present.
6. Merge the Stop hook block from `docs/bundle/settings.json.snippet` into `.claude/settings.json` (preserve any existing hooks).
7. Prompt: `Install pre-push hook that runs /vskit:audit-traceability and /vskit:check-deploy? [Y/n]`. On `Y`, install per §5.2.1.
8. Print a summary of created/updated files.
