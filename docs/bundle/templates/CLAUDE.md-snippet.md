<!--
Paste the §Commands section below into your repo's CLAUDE.md.
The "Framework:" line MUST point at the bundle's spec file.
The Repo-Specific Overrides table is where you bind framework
command names to shell invocations valid for your stack.
-->

## Commands

Framework: docs/bundle/vertical-slices-ai-framework.md

### Repo-Specific Overrides

| Command | Shell invocation |
|---------|-----------------|
| `/vskit:run-tests` | `<your test command — e.g. npm test, pytest, cargo test>` |
| `/vskit:run-e2e` | `<your e2e command — e.g. npx playwright test>` |
| `/vskit:health-check` | `<your health-check command — e.g. curl -sf http://localhost:3000/health>` |
| `/vskit:deploy` | `<your deploy command — e.g. docker compose up -d --build>` |

> **Do not redefine** `/vskit:check deploy`, `/vskit:score`, `/vskit:critique spec`, `/vskit:critique prd`,
> `/vskit:audit-traceability`, `/vskit:init-framework`, or any other framework-owned command.
> Overriding them silently changes ship-gate semantics. (spec §9)

### Framework settings (optional)

- `Traceability: aspirational`   — exempt the repo from `/vskit:audit-traceability` per §0.1
- `Weekly token budget: <N>`     — override the §5.3 default of 100 000 tokens/week
