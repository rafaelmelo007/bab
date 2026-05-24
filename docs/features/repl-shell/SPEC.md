# REPL Shell — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** High
**Applies:** []
**Touches:** [src/repl/**]
**Prototype:** N/A
**Agents:** backend-lead, ux-specialist, testing-lead
**Source:** docs/prds/2026-05-23-ulm.md §4.1, §4.5, §4.7, §4.8, §4.9, §7.1, §7.3, §7.4
**Last updated:** 2026-05-23

---

## §1 Problem Statement

`ulm` needs an interactive entry point: typing `ulm` should land the user in a persistent REPL where they enter prompts and slash commands until they exit. This feature delivers the shell loop, prompt prefix, line editing, history, signal handling, and the cold-start UX (no-provider error, unknown-command Levenshtein hint, first-run screens). It is the substrate every provider/routing feature plugs into; without it nothing else has a place to run.

## §2 Scope

### In Scope
- Persistent REPL loop: read a line, dispatch, print, loop. Built on `node:readline.createInterface` with custom Ctrl-C / Ctrl-D handling (D-02).
- Prompt prefix rendered by a single pure function `renderPrompt(state)` returning `"ulm> "` when no provider is selected and `"ulm (<provider>)> "` once one is set.
- In-memory history (Up/Down arrow recall); **not persisted across restarts** per PRD §4.7 (D-03).
- Line editing via `node:readline` built-ins (Ctrl-A/E line nav, Ctrl-W word kill, Ctrl-U line kill, Ctrl-K kill-to-EOL); Alt-←/→ word jump where the terminal supports it.
- Cold-start surfaces (no provider yet): the §4.8 `NoProvider` error per AC-02 wording; first-run screens per PRD §4.7 (both ≥1-detected and zero-detected variants).
- `Ctrl-D` semantics (D-04): empty buffer → exit 0; non-empty buffer → silently ignored.
- `Ctrl-C` semantics (D-05): single press → cancel current input line (print `^C`, discard buffer, reprompt); second within 1 s → exit 130.
- SIGWINCH (Unix) / Windows console resize → full prompt re-render via `readline.cursorTo` + redraw; long lines wrap.
- `NO_COLOR` / `FORCE_COLOR` / `--no-color` honored; UTF-8 glyphs degrade to ASCII per §4.7.
- Startup p95 ≤ 80 ms (PRD §7.1) — enforced via tinybench gate; achieved via lazy imports of F-02/F-05.

### Out of Scope
- Provider dispatch and routing commands (`/provider`, `/providers`, `/model`, `/new`, `/sessions`, `/resume`) — owned by F-06 (parsing) + F-02 / F-05 (handlers).
- Provider transport (ACP / `-p` / HTTP) — F-02.
- One-shot mode (`ulm -p <provider> "<prompt>"`) — F-07.
- Daemon mode (PRD §9, v2).
- Conversation history rendering, markdown reflow, syntax highlighting — output is streamed verbatim from providers.
- Mid-stream Ctrl-C subprocess cancellation — owned by F-02; this feature only handles idle-prompt Ctrl-C.
- Tab completion (v2 candidate per PRD §4.7).
- Persistent history across restarts (DEF-01).

## §3 Acceptance Criteria

- [ ] AC-01: Running `ulm` with no arguments and an existing `state.toml` enters a REPL and prints `ulm> ` on stdout (no provider state).
- [ ] AC-02: When no provider is selected, plain text input (anything not starting with `/`) prints exactly `✗ no provider selected. Run: /provider <name>` (PRD §4.7 / F-08 `NoProvider`), no subprocess is invoked, and the REPL re-prompts.
- [ ] AC-03: `/help` prints the verbatim §4.9 block (from `tests/fixtures/help_output.txt`, owned by F-06 D-02), terminated by exactly one newline before the next prompt. Snapshot-tested via vitest.
- [ ] AC-04: `/clear` emits ANSI `\x1B[2J\x1B[H` on UTF-8 / modern terminals; emits nothing when `NO_COLOR` is set OR stdout is not a TTY; never invokes a subprocess.
- [ ] AC-05: `/exit` exits the process with status code 0 within 50 ms (no in-flight subprocesses in this feature; F-02 owns subprocess cleanup hooks).
- [ ] AC-06: `Ctrl-D` on an empty input buffer exits with status 0. `Ctrl-D` on a non-empty buffer is consumed silently — buffer and cursor unchanged, no `^D` echoed, no re-prompt.
- [ ] AC-07: First `Ctrl-C` mid-line discards the buffer, prints `^C\n`, re-prompts on a new line; second `Ctrl-C` within 1000 ms of the first exits with status 130 (§4.7 double-Ctrl-C; mid-stream cancellation lives in F-02 — this AC covers idle-prompt path only).
- [ ] AC-08: Up-arrow recalls the previous prompt within the current REPL session; Down-arrow walks forward; history is **in-memory only, not persisted across restarts** (PRD §4.7). Confirmed by relaunching ulm between two prompts and asserting Up-arrow returns the new session's empty history.
- [ ] AC-09: Unknown slash command `/foo` prints exactly `✗ unknown command: /foo. Try /help.` followed, on a new line iff a known command at Levenshtein ≤ 2 exists, by `Did you mean /<closest>?` (tie-break by F-06 `HELP_ORDER` index). Dispatch + suggestion are F-06's job; this feature only routes the input to the dispatcher and prints the result.
- [ ] AC-10: Prompt prefix is rendered by a single pure function `renderPrompt(state) → string` returning `"ulm> "` when `state.activeProvider === undefined` and `"ulm (<name>)> "` otherwise. No ANSI escapes in the prompt string when `NO_COLOR` is set or stdout is non-TTY.
- [ ] AC-11: SIGWINCH (Unix) / `process.stdout.on('resize')` (Windows) triggers a full prompt re-render via readline; long input lines wrap rather than truncate. Cursor position remains correct after resize.
- [ ] AC-12: REPL startup p95 ≤ 80 ms on a cached state.toml, measured by `time node bin/ulm.mjs </dev/null` over 100 runs on `ubuntu-latest` (matches PRD §7.1 row). Hard gate in `tinybench`.

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | REPL startup ≤ 80 ms p95 on cached state (`ubuntu-latest`); prompt re-display ≤ 10 ms after a local command. Tight under Node baseline (~30–60 ms); requires lazy imports + `node --no-warnings`. |
| Accessibility | Honors `NO_COLOR`, `FORCE_COLOR`, `--no-color`. UTF-8 glyphs auto-fallback to ASCII when `LANG`/`LC_ALL` lacks UTF-8 or legacy Windows console detected. No information conveyed by color alone. |
| Cross-platform | Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. Linux glibc ≥ 2.28, macOS 12+, Windows 10 1809+. Config dir via F-04. Ctrl-C uses `SIGINT` (Unix) / `readline`'s `SIGINT` event (Windows). |
| Security | No subprocess execution in this feature. History stays in-memory in v1 — no on-disk history file (PRD §4.7 explicit). state.toml read is delegated to F-04. |
| Testability | All TTY-affecting behavior testable under `node-pty` harness; snapshot tests for static strings via vitest. |
| Portability | Pure JS — `node:readline` built-in. Runs on Node `^20.10 \|\| ^22 \|\| ^24`. |

## §5 Data Model

> Not applicable — REPL state is in-memory only.

## §6 Interface Contracts

> Not applicable — the interface here is stdin/stdout and signal handling, captured in §3 ACs directly.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit | `renderPrompt(undefined)` / `renderPrompt("claude")` | Returns `"ulm> "` / `"ulm (claude)> "` exactly |
| TC-02 | Snapshot (vitest) | `/help` byte-equality | `expect(out).toMatchSnapshot()` matches PRD §4.9 verbatim block via the shared `tests/fixtures/help_output.txt` |
| TC-03 | Snapshot | `NoProvider` error string | Output equals `"✗ no provider selected. Run: /provider <name>\n"` |
| TC-04 | node-pty | Unknown command Levenshtein-1 | Send `/hep\n` → output contains `unknown command: /hep` then `Did you mean /help?` on next line |
| TC-05 | node-pty | Unknown command no suggestion | Send `/xyzzy\n` → contains `unknown command: /xyzzy` and does NOT contain `Did you mean` |
| TC-06 | node-pty | Ctrl-D on empty | Send raw `\x04` at fresh prompt → process exits 0 within 100 ms |
| TC-07 | node-pty | Ctrl-D on non-empty | Send `foo`, then `\x04` → buffer retained, no exit; follow with `\n` (without provider) → `NoProvider` fires |
| TC-08 | node-pty | Double Ctrl-C exit | Send `partial`, `\x03`, `\x03` within 500 ms → exit code 130 |
| TC-09 | node-pty | Single Ctrl-C cancel | Send `partial`, `\x03`, wait 1100 ms, `/exit\n` → exit 0; output contained `^C` after `partial` |
| TC-10 | node-pty | `NO_COLOR` strips ANSI from `/clear` | With `NO_COLOR=1`, send `/clear\n` → no `\x1B[2J` bytes in stdout |
| TC-11 | Bench (tinybench) | REPL startup p95 | 1000 iterations of `node bin/ulm.mjs </dev/null` ≤ 80 ms p95 on ubuntu-latest |
| TC-12 | node-pty | SIGWINCH re-render | Resize tty mid-prompt → prompt re-rendered at new width, cursor at correct column |
| TC-13 | Snapshot | First-run zero-providers screen | Output matches PRD §4.7 "No providers found" block verbatim |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-ulm.md §4.1 (Launch), §4.5 (Slash commands), §4.7 (UX baseline), §4.8 (error catalog), §4.9 (/help)
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** [state-store, provider-discovery, slash-commands, error-surfaces]

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | Implementation language (Rust / Go / Python / Node) | backend-lead | Resolved (2026-05-23) | Node.js per PRD §13 Q-06 (post-promotion flip) |
| Q-02 | Readline library | backend-lead | Resolved (2026-05-23) | Built-in `node:readline` per D-02; no external dep needed |
| Q-03 | History persistence | backend-lead | Resolved (2026-05-23) | In-memory only in v1 per PRD §4.7 (D-03); persistent across-restart is DEF-01 |
| Q-04 | `/clear` mechanism | ux-specialist | Resolved (2026-05-23) | ANSI `\x1B[2J\x1B[H`, suppressed under NO_COLOR / non-TTY (D-06) |
| Q-05 | How does the REPL receive "current provider" state from F-04 and stay consistent if a parallel one-shot writes? | backend-lead | Open | Re-read state.toml on every dispatch (cheap — F-04 NFR ≤ 5 ms p95) is simplest. Resolve before T-01. |
| Q-06 | On Windows legacy console, does `node:readline` correctly receive `SIGINT` from `CTRL_C_EVENT`? | backend-lead | Open | Verify via node-pty harness on `windows-latest` before AC-07 ships. |

## §10 Implementation Notes

- The REPL must not depend on any provider being installed. AC-02's no-provider path is the cold-start experience.
- Signal handling on Windows differs from Unix; `node:readline` normalizes `SIGINT` events across platforms, but `tree-kill` semantics (F-02) for child processes still differ — handled in F-02, not here.
- The prompt prefix is intentionally derived from a single function (`renderPrompt(state)`) so F-02 / F-05 can update state and the REPL re-reads it on next iteration — no event bus needed for v1.
- History is in-memory only via `readline`'s built-in `historySize` option. PRD §4.7 explicit non-persistence simplifies cross-platform behavior.
- Lazy imports for AC-12 startup budget: import F-02 / F-05 handler modules from inside dispatch callbacks, not at top-level. Verified by `node --trace-warnings bin/ulm.mjs </dev/null` showing F-02 / F-05 not loaded until first dispatch.
