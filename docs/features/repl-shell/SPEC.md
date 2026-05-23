# REPL Shell — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** High
**Applies:** []
**Touches:** [<TBD — populate once code lands, e.g. `src/repl/**`>]
**Prototype:** N/A
**Agents:** backend-lead, ux-specialist, testing-lead
**Source:** docs/prds/draft/2026-05-23-bab.md §4.1, §4.5
**Last updated:** 2026-05-23
**Score:** See SCORE.md

---

## §1 Problem Statement

`bab` needs an interactive entry point: typing `bab` should land the user in a persistent REPL where they enter prompts and slash commands until they exit. This feature delivers the shell loop, prompt prefix, and the local-only commands (`/help`, `/clear`, `/exit`). It is the substrate every provider/routing feature plugs into; without it nothing else has a place to run.

## §2 Scope

### In Scope
- Persistent REPL loop: read a line, dispatch, print, loop.
- Prompt prefix that renders `bab> ` when no provider is selected and `bab (<provider>)> ` once one is set.
- Line editing with history (up/down arrows, Ctrl-R reverse search) using the host platform's readline equivalent.
- Local slash commands that do not need a provider: `/help`, `/clear`, `/exit`.
- `Ctrl-D` and `Ctrl-C` handling — `Ctrl-D` exits cleanly, `Ctrl-C` cancels the current input line.
- Exit code 0 on clean exit, non-zero on fatal startup error.

### Out of Scope
- Provider dispatch and routing commands (`/provider`, `/providers`, `/model`, `/new`, `/sessions`, `/resume`). Lives in `provider-routing` feature.
- Provider transport (ACP / `-p` / HTTP). Lives in per-provider features (`provider-claude`, `provider-codex`, `provider-gemini`, `provider-ollama`).
- One-shot mode (`bab -p <provider> "<prompt>"`). Separate feature `oneshot-mode`.
- Daemon mode. Out of scope for v1 entirely (PRD §6.5).
- Conversation history rendering, markdown reflow, syntax highlighting — output is streamed verbatim from providers.

## §3 Acceptance Criteria

> Each AC must be independently verifiable. Mark `[x]` when test passes.

- [ ] AC-01: Running `bab` with no arguments enters a REPL and prints the prompt `bab> ` on stdout.
- [ ] AC-02: When no provider is selected, plain text input (anything not starting with `/`) prints a clear error: `no provider selected — try /provider <name>` and re-prompts.
- [ ] AC-03: `/help` prints the list of available slash commands and re-prompts. Output includes at minimum: `/help`, `/clear`, `/exit`.
- [ ] AC-04: `/clear` clears the visible terminal buffer (equivalent to `clear` / `Ctrl-L`) and re-prompts.
- [ ] AC-05: `/exit` exits the REPL with status code 0.
- [ ] AC-06: `Ctrl-D` on an empty prompt exits with status code 0. On a non-empty prompt, `Ctrl-D` is ignored.
- [ ] AC-07: `Ctrl-C` cancels the current input line (prints `^C`, discards the buffer, re-prompts). It does not exit the REPL.
- [ ] AC-08: Up-arrow recalls the previous command from history; history persists across REPL invocations under the platform conventions for the chosen implementation language.
- [ ] AC-09: An unknown slash command (e.g. `/foo`) prints `unknown command: /foo — try /help` and re-prompts. Does not exit.

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | Prompt re-display < 20 ms after a local command on an idle machine |
| Error budget | N/A — interactive shell, not a service |
| Browser support | N/A — terminal app |
| Quota enforcement | N/A |
| Accessibility | Prompt renders on a screen reader without ANSI escape garbage; respects `NO_COLOR` env var |
| Security | No subprocess execution in this feature (provider features add that). No file reads beyond the history file under the user's config dir |

## §5 Data Model

> Not applicable — `Applies` does not include `dbschema`.

## §6 Interface Contracts

> Not applicable — `Applies` does not include `interface-contracts`. The "interface" here is stdin/stdout and signal handling, captured in §3 ACs directly.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit | Prompt prefix renderer with no provider | Returns exactly `bab> ` |
| TC-02 | Unit | Prompt prefix renderer with provider=claude | Returns exactly `bab (claude)> ` |
| TC-03 | Unit | Slash command dispatcher: `/help`, `/clear`, `/exit`, unknown | Each returns the documented action; unknown returns an error result, not a crash |
| TC-04 | Integration | Spawn the REPL via a pty harness, send `/help\n` then `/exit\n` | Stdout contains the command list; process exits 0 |
| TC-05 | Integration | Spawn the REPL, send Ctrl-C mid-line, then `/exit` | Buffer is discarded; `^C` is printed; final exit is 0 |
| TC-06 | Integration | Spawn REPL, type plain text without provider, observe error | Error text matches AC-02 verbatim; process still alive |

## §8 Cross-References

- **PRD:** docs/prds/draft/2026-05-23-bab.md §4.1 (Launch), §4.5 (Slash commands table)
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** []

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | Implementation language (Rust / Go / Python)? | backend-lead | Open | Lean Rust per PRD §6 Q6; decide before T-01 starts |
| Q-02 | Which readline library? `rustyline` (Rust) / `liner` / `linenoise` / `prompt_toolkit` (Python) | backend-lead | Open | Depends on Q-01 |
| Q-03 | Where does history live? `~/.config/bab/history` vs platform-specific dirs (XDG / `%APPDATA%`) | backend-lead | Open | Likely follow `directories`/`dirs` crate conventions; defer until Q-01 resolved |
| Q-04 | Should `/clear` use ANSI `ESC[2J` or the platform's `clear` syscall equivalent? | ux-specialist | Open | ANSI works on Windows Terminal + macOS + Linux modern terminals; pick that unless we find a real exception |

## §10 Implementation Notes

- The REPL must not depend on any provider being installed. AC-02's "no provider selected" path is the cold-start experience.
- Signal handling on Windows differs from Unix; the `Ctrl-C cancels line, Ctrl-D exits` semantics must be tested under both pty harnesses.
- The prompt prefix is intentionally derived from a single function (`render_prompt(state)`) so `provider-routing` can change state and the REPL re-reads it on next iteration — no event bus needed for v1.
- History file format should be append-only line-based plaintext so a user can `tail` or `grep` it.
