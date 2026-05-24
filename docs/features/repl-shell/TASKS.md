# Tasks — REPL Shell

**Feature:** repl-shell
**Source:** SPEC.md (12 ACs), DECISIONS.md (D-01..D-11)
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Scaffold `src/repl/index.ts` exporting `runRepl(opts) → Promise<number>` (returns exit code 0/130) | backend-lead | High | Done | AC-01, AC-05 | D-01 |
| T-02 | Implement `renderPrompt(state)` pure function: `"bab> "` when no provider, `"bab (<name>)> "` when set; no ANSI under NO_COLOR / non-TTY | backend-lead | High | Done | AC-01, AC-10 | — |
| T-03 | Create `readline.Interface` via `node:readline.createInterface({ input: process.stdin, output: process.stdout, historySize: 1000 })` | backend-lead | High | Done | AC-01, AC-08 | D-02 |
| T-04 | Implement main read-dispatch-print loop: read line → if starts with `/` route to F-06 dispatch, else route to F-02 transport (or `NoProvider` if none set) | backend-lead | High | Done | AC-01, AC-02 | — |
| T-05 | Wire F-08 `NoProvider` error for non-slash input before any `/provider` is set; print exactly `✗ no provider selected. Run: /provider <name>` | backend-lead | High | Done | AC-02 | D-07 |
| T-06 | Wire F-06 `/help` handler (verbatim output via shared `tests/fixtures/help_output.txt` per F-06 D-02) | backend-lead | High | Done | AC-03 | D-08 |
| T-07 | Implement Ctrl-D handling via readline `close` event: exit 0 on empty buffer; ignore silently on non-empty buffer | backend-lead | High | Done | AC-06 | D-04 |
| T-08 | Implement Ctrl-C handling: register `process.on('SIGINT', ...)` or readline `SIGINT` event; first press → discard buffer + print `^C\n` + reprompt; second within 1000 ms → exit 130 | backend-lead | High | Done | AC-07 | D-05 |
| T-09 | Implement SIGWINCH handler (Unix) / `process.stdout.on('resize')` (Windows) → full prompt re-render via `readline.cursorTo(0)` + redraw | backend-lead | Medium | Done | AC-11 | — |
| T-10 | Implement first-run welcome screen rendering (F-03 provides detection result; F-01 renders): both ≥1-detected and zero-detected variants per PRD §4.7 | ux-specialist | High | Done | (covered by F-03 ACs but rendered here) | D-09 |
| T-11 | Implement lazy imports of F-02 / F-05 / F-06 handler modules: imported from inside dispatch callbacks, NOT at top-level; verified by `node --trace-warnings` | backend-lead | High | Done | AC-12 | D-11 |
| T-12 | Write vitest unit test for `renderPrompt(undefined)` / `renderPrompt("claude")` returning `"bab> "` / `"bab (claude)> "` exactly | testing-lead | High | Done | TC-01 | — |
| T-13 | Add `node-pty` (^1) dev dep to package.json | testing-lead | High | Done | (test harness) | — |
| T-14 | Write vitest snapshot test for `/help` byte-equality (consumes F-06's shared fixture) | testing-lead | High | Done | TC-02 | D-08 |
| T-15 | Write vitest snapshot test for `NoProvider` error string exact match | testing-lead | High | Done | TC-03 | D-07 |
| T-16 | Write node-pty integration test for unknown-command Levenshtein-1 (`/hep` → `Did you mean /help?`) | testing-lead | High | Done | TC-04 | — |
| T-17 | Write node-pty integration test for unknown command no-suggestion (`/xyzzy`) | testing-lead | Medium | Done | TC-05 | — |
| T-18 | Write node-pty test for Ctrl-D on empty → exit 0 within 100 ms (TC-06) | testing-lead | High | Done | TC-06 | D-04 |
| T-19 | Write node-pty test for Ctrl-D on non-empty → buffer retained, no exit (TC-07) | testing-lead | High | Done | TC-07 | D-04 |
| T-20 | Write node-pty test for double Ctrl-C within 500 ms → exit 130 (TC-08) | testing-lead | High | Done | TC-08 | D-05 |
| T-21 | Write node-pty test for single Ctrl-C cancel (TC-09) | testing-lead | High | Done | TC-09 | D-05 |
| T-22 | Write node-pty test for `/clear` ANSI strip under `NO_COLOR=1` (TC-10) | testing-lead | Medium | Done | TC-10 | D-06 |
| T-23 | Wire `tinybench` startup benchmark: 1000 iterations of `node bin/bab.mjs </dev/null` ≤ 80 ms p95 on `ubuntu-latest` | perf-specialist | High | Done | TC-11, AC-12 | — |
| T-24 | Write node-pty test for SIGWINCH re-render | testing-lead | Medium | Done | TC-12, AC-11 | — |
| T-25 | Write snapshot test for first-run zero-providers screen | testing-lead | Medium | Done | TC-13 | D-09 |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
