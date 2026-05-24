# Tasks — One-Shot Mode

**Feature:** one-shot-mode
**Source:** SPEC.md (13 ACs), DECISIONS.md (D-01..D-04)
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Add `commander` (^12) dep to package.json | backend-lead | High | Done | AC-01 | D-04 |
| T-02 | Scaffold `src/cli/index.ts` — `commander`-based root program declaring `-p <provider>`, `--no-color`, positional `[prompt]`, and `--` passthrough | backend-lead | High | Done | AC-01, AC-04 | D-04 |
| T-03 | Scaffold `src/oneshot/index.ts` exporting `runOneShot(opts) → Promise<number>` (returns exit code) | backend-lead | High | Done | AC-01 | — |
| T-04 | Implement positional + stdin concatenation (`positional + "\n\n" + stdin`, trailing newline stripped) per D-03 | backend-lead | High | Done | AC-03 | D-03 |
| T-05 | Implement `--` separator handling: prove that `ulm -p claude -- --help me` treats `"--help me"` as the prompt | backend-lead | High | Done | AC-04 | — |
| T-06 | Implement stdin trichotomy: TTY (`process.stdin.isTTY === true`) → throw `CliNoPrompt('no_arg')`; 0-byte pipe → throw `CliNoPrompt('empty_stdin')`; bytes → use them | backend-lead | High | Done | AC-05, AC-06 | — |
| T-07 | Add `CliNoPrompt` + `CliInvalidUtf8` subclasses to F-08 `UlmError` hierarchy (cross-feature dep on F-08) | backend-lead | High | Done | AC-05, AC-06, AC-13 | D-02 |
| T-08 | Implement UTF-8 validation via `new TextDecoder('utf-8', { fatal: true })` on stdin buffer; throw `CliInvalidUtf8` with byte offset on error | backend-lead | High | Done | AC-13 | D-02 |
| T-09 | Wire `runOneShot` through F-02 `ProviderTransport.send()` for the single turn; stream `TokenEvent { kind: 'content' }` to stdout | backend-lead | High | Done | AC-01, AC-02 | — |
| T-10 | Implement TTY-aware stdout: cache `process.stdout.isTTY` at startup; respect `NO_COLOR` / `FORCE_COLOR` / `--no-color` per F-08 §5 precedence | backend-lead | High | Done | AC-07 | — |
| T-11 | Implement `UlmError.exitCode()` table-driven exit per D-01 in `src/oneshot/exitCodes.ts`: 0/1/2/69/74/77/124/126/127 mapping | backend-lead | High | Done | AC-10 | D-01 |
| T-12 | Implement hard wall-clock cap `ULM_TURN_TIMEOUT + 2s` outer timeout (above F-02's per-turn timeout) — never hangs even if F-02 hangs | backend-lead | Medium | Done | (NFR Error budget) | — |
| T-13 | Wire env denylist via shared `src/spawn/index.ts` (owned by F-02 D-02); add Touches entry to lock the dep | security-specialist | High | Done | AC-08 | — |
| T-14 | Wire session-ID writeback via F-04 `stateStore.save(state => state.sessions[provider].id = …)` per-key callback (never whole-file overwrite) | backend-lead | High | Done | AC-11 | — |
| T-15 | Add CI grep rule blocking `shell: true` in `src/oneshot/` (security parity with F-02) | security-specialist | High | Done | AC-09 | D-07 (F-02 cross-ref) |
| T-16 | Add lazy-imports discipline (import F-02 transport modules only after `commander` parses) — proven by `node --trace-warnings` showing transport not loaded until first dispatch; supports startup p95 budget | backend-lead | Medium | Done | (NFR Latency) | — |
| T-17 | Write vitest unit tests for `parseArgs`: positional, `--` separator, no-positional | testing-lead | High | Done | TC-01, TC-02 | — |
| T-18 | Write vitest unit test for `combinePrompt("foo", "bar\n")` → `"foo\n\nbar"` | testing-lead | High | Done | TC-03, AC-03 | D-03 |
| T-19 | Write vitest table-driven test for exit-code mapper covering all §4.8 codes | testing-lead | High | Done | TC-04, AC-10 | D-01 |
| T-20 | Write integration tests for happy paths: `-p mock "hi"` (TC-05), `echo \| ulm -p mock` (TC-06), concat (TC-07) | testing-lead | High | Done | TC-05..TC-07 | — |
| T-21 | Write node-pty integration test for TTY-stdin no-prompt error (TC-08) | testing-lead | High | Done | TC-08, AC-05 | — |
| T-22 | Write integration test for empty-pipe `CliNoPrompt('empty_stdin')` (TC-09) | testing-lead | High | Done | TC-09, AC-06 | — |
| T-23 | Write integration test for env denylist parity with REPL (TC-10) | testing-lead | High | Done | TC-10, AC-08 | — |
| T-24 | Write integration tests for ANSI handling: `NO_COLOR=1` (TC-11/TC-12), `FORCE_COLOR=1` (TC-13) | testing-lead | Medium | Done | TC-11..TC-13, AC-07 | — |
| T-25 | Write integration test for mid-stream crash + exit code mapping (TC-14) | testing-lead | High | Done | TC-14, AC-10 | — |
| T-26 | Write integration test for `ULM_TURN_TIMEOUT=1` + hung mock → exit within 3s, `CliTimeout` (TC-15) | testing-lead | High | Done | TC-15 | — |
| T-27 | Write integration test for `ulm -p unknown "x"` → `InvalidProvider` exit code (TC-16) | testing-lead | Medium | Done | TC-16, AC-10 | — |
| T-28 | Write concurrent test (vitest concurrent or fast-check): REPL `[sessions].claude = R1` + one-shot `[sessions].gemini = O1` in parallel; assert both present, no leftover lockfile; loop 10× | testing-lead | High | Done | TC-17, AC-11 | — |
| T-29 | Author shell-injection corpus (20 prompts with `$()`, backticks, `;rm`, `&&`) + canary-file integration test | security-specialist | High | Done | TC-19, AC-09 | — |
| T-30 | Write vitest snapshot test for `ulm --help` output (documents `--` separator) | testing-lead | Medium | Done | TC-20 | — |
| T-31 | Write stress test: 100 concurrent one-shots against a REPL holding state.toml lock with varied cadences; quantifies Q-02 risk | testing-lead | Medium | Done | TC-21 | — |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
