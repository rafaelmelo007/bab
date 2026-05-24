# Decisions — REPL Shell

**Feature:** repl-shell
**Source:** /vskit:critique-spec repl-shell (2026-05-23, self-review via general-purpose agent playing backend-lead + ux-specialist + testing-lead + prompt-engineer lenses); Node.js retrofit 2026-05-23 after PRD §13 Q-06 flipped Rust → Node.js.
**Last updated:** 2026-05-23

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | backend-lead | Implementation language | Node.js per PRD §13 Q-06 (operator preference; supersedes earlier Rust resolution) | Cascades into all transport / state / packaging decisions; binary-size G-06 redefined as npm tarball / installed-footprint cap. | SPEC §9 Q-01 resolved; SPEC §10 | — |
| D-02 | 2026-05-23 | backend-lead | Readline crate / library | Built-in `node:readline.createInterface` with custom Ctrl-C / Ctrl-D event handlers | Zero install-footprint cost (PRD G-06); supports Up/Down history, line editing, SIGWINCH re-render. `@inquirer/prompts` and `enquirer` are interactive-prompt libs, not persistent REPLs. Custom signal handling layered on top. | SPEC §9 Q-02 resolved; SPEC §10 | — |
| D-03 | 2026-05-23 | backend-lead | History persistence | In-memory only, no file | PRD §4.7 explicit ("not persisted across restarts in v1"); persistent history is a §15 v2 candidate. `readline`'s `historySize` option handles in-memory backing. | SPEC §9 Q-03 resolved; SPEC §10; AC-08 tightened | — |
| D-04 | 2026-05-23 | backend-lead | Ctrl-D semantics on non-empty buffer | Silently ignored (no `^D` echo, no re-prompt) | Aligns with bash / zsh convention; PRD §4.5 implies via `/exit or Ctrl-D` | AC-06 split into empty / non-empty cases; TC-06 / TC-07 | — |
| D-05 | 2026-05-23 | backend-lead | Ctrl-C semantics | Single = cancel-line; double within 1 s = exit 130 | PRD §4.7 double-Ctrl-C explicit | AC-07; TC-08 / TC-09 | — |
| D-06 | 2026-05-23 | ux-specialist | `/clear` mechanism | ANSI `\x1B[2J\x1B[H`, suppressed under `NO_COLOR` / non-TTY | PRD §4.7 — ANSI works on Windows Terminal + macOS + Linux modern terminals | SPEC §9 Q-04 resolved; AC-04 specifies bytes | — |
| D-07 | 2026-05-23 | ux-specialist | AC-02 error string format | Verbatim `✗ no provider selected. Run: /provider <name>` (F-08 `NoProvider`) | PRD §4.7 / §4.8 fix this byte-for-byte | AC-02 tightened; TC-03 added; F-08 INTERFACE-CONTRACTS cross-ref | — |
| D-08 | 2026-05-23 | prompt-engineer | AC-03 `/help` output | Verbatim PRD §4.9 block via F-06's shared `tests/fixtures/help_output.txt` fixture, snapshot-tested | PRD §4.9 is the source of truth; F-06 D-02 owns the fixture; "at minimum" wording would let implementations drift | AC-03 tightened; TC-02 added; F-06 fixture path | — |
| D-09 | 2026-05-23 | prompt-engineer | First-run screens are this feature's responsibility | Yes (rendering); detection is F-03 (`provider-discovery`) | PRD §4.7 first-run screens render at REPL start; F-03 supplies the detection result | Scope adds first-run screens; TC-13 added; Blocked-by includes F-03 | — |
| D-10 | 2026-05-23 | backend-lead | Subprocess lifecycle | Out of scope — F-02 owns it; this feature's AC-07 covers idle-prompt Ctrl-C only | PRD §5.1.2 places lifecycle in transport layer | §2 Out-of-Scope already states this; AC-07 wording clarified | — |
| D-11 | 2026-05-23 | testing-lead | Startup budget enforcement strategy | Lazy imports for F-02/F-05 handler modules — imported from inside dispatch callbacks, not at top-level. Verified by `node --trace-warnings`. | Node startup baseline is ~30–60 ms; 80 ms p95 budget leaves ~20–50 ms for our code. Loading the transport layer at top-level would burn that headroom on first launch. | SPEC §10; AC-12; TC-11 | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | Persistent history across restarts | PRD §15 v2 candidate; AC-08 explicitly says in-memory | After v1.0 ships and §10.1 adoption signals pass day-30 |
| DEF-02 | Tab completion | PRD §4.7 explicit v2 candidate | v2 planning |
| DEF-03 | `/sessions` and `/resume` rendering inside REPL | Owned by F-05 `session-management`; this feature only routes the slash command parse to F-06 dispatcher | F-05 SPEC drafted |
| DEF-04 | Spinner pre-first-byte (80 ms cadence, 200 ms min) | No streaming in this feature; spinner is F-02 transport's responsibility | F-02 SPEC drafted |
| DEF-05 | Mid-stream Ctrl-C cancellation of subprocess | Belongs to F-02; this feature only handles idle-prompt Ctrl-C | F-02 SPEC drafted |
