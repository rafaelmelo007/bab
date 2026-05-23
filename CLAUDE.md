# CLAUDE.md — bab

A unified CLI gateway to Claude, Codex, Gemini, and Ollama. See [`docs/prds/draft/2026-05-23-bab.md`](./docs/prds/draft/2026-05-23-bab.md) for the product brief.

## Repo state

- **Pre-code.** The PRD is in `docs/prds/draft/` awaiting `/vskit:review prd`. One feature (`repl-shell`) is scaffolded with SPEC, TASKS, DECISIONS, SCORE. No source code yet — language choice is `repl-shell` SPEC §9 Q-01.
- Working directory: Windows. Bash and PowerShell both available.
- All 36 `/vskit:*` commands are wired as Claude Code slash commands under `.claude/commands/vskit/`.

## Setup notes

- **Stop hook depends on `jq`.** The `worklog-stop-hook.sh` shells out to `jq` on every turn (parses the Stop event JSON, line 29). Without it on PATH, `docs/worklog/YYYY-MM-DD.md` files will not be created. On Windows: `winget install jqlang.jq` then restart Claude Code so the hook subprocess inherits the new PATH.

## Commands

Framework: docs/bundle/vertical-slices-ai-framework.md

### Repo-Specific Overrides

| Command | Shell invocation |
|---------|-----------------|
| `/vskit:run-tests` | *TBD — set once language is chosen (e.g. `cargo test`, `go test ./...`, `pytest`)* |
| `/vskit:run-e2e` | *TBD — pty-harness suite once it exists* |
| `/vskit:health-check` | N/A — `bab` is an interactive CLI, no health endpoint |
| `/vskit:deploy` | *TBD — likely `cargo build --release` + GitHub Release upload* |

> **Do not redefine** `/vskit:check deploy`, `/vskit:score`, `/vskit:critique spec`, `/vskit:critique prd`,
> `/vskit:audit-traceability`, `/vskit:init-framework`, or any other framework-owned command.
> Overriding them silently changes ship-gate semantics. (spec §9)

### Framework settings

- **Weekly token budget:** 100000 — default per spec §5.3 (bold format required so `worklog-stop-hook.sh` line 193 regex matches; backticked form is silently ignored).
