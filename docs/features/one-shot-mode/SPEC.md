# One-Shot Mode — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** Medium
**Applies:** []
**Touches:** [src/oneshot/**, src/cli/**, src/spawn/**]
**Prototype:** N/A
**Agents:** backend-lead, security-specialist, testing-lead
**Source:** docs/prds/2026-05-23-ulm.md §6 — F-07; §4.6, §4.7, §4.8, §5.2.1, §7.2
**Last updated:** 2026-05-23

---

## §1 Problem Statement

Half of ulm's value is being scriptable: `ulm -p claude "summarize this" < notes.txt`, `echo "rewrite in french" | ulm -p gemini`. This feature owns the non-interactive entry point — flag parsing, stdin reading, single-turn invocation, exit-code propagation, and the `--` flag-separator that prevents `--help`-shaped prompts from being misread. It reuses every other feature's machinery (transport, sessions, errors) and concurrently shares state.toml with a running REPL via F-04's per-key merge.

## §2 Scope

### In Scope
- CLI flag parsing via `commander` v12 (D-04).
- `ulm -p <provider> "<prompt>"` (positional prompt), `ulm -p <provider>` + stdin (piped), `ulm -p <provider> "<positional>" < stdin_file` (concatenated per D-03).
- `--` separator per §7.2: everything after `--` is one prompt string, never parsed as a flag.
- Single-turn invocation through F-02's `ProviderTransport.send()`.
- Exit codes per D-01 mapping table: 0 success; POSIX/sysexits conventions for failure (124 timeout, 126 unauth, 127 missing, 74 IO, 77 perms, 69 unavailable, 2 usage, 1 generic).
- TTY detection via `process.stdout.isTTY` / `process.stdin.isTTY`; ANSI auto-disabled when stdout not a TTY; `NO_COLOR` / `FORCE_COLOR` / `--no-color` honored.
- Stdin trichotomy: TTY (no input — throws `CliNoPrompt('no_arg')`), 0-byte pipe (throws `CliNoPrompt('empty_stdin')`), N>0 byte pipe (use bytes); invalid UTF-8 → `CliInvalidUtf8` (D-02, new code added to F-08 catalog).
- Concurrent state.toml access alongside REPL — uses F-04's `stateStore.save(state => state.sessions[X] = id)` per-key callback API (NFR Concurrency).
- Env denylist parity with REPL via shared `src/spawn/index.ts` (single function, not policy-shared).
- Hard wall-clock cap = `ULM_TURN_TIMEOUT + 2s` after which ulm itself exits `CliTimeout` (never hangs).

### Out of Scope
- The REPL loop — F-01. Verified by AC-12.
- Multi-turn conversation in one-shot — single round-trip per §4.6.
- Piping between providers (`ulm -p claude "..." | ulm -p gemini "..."` works at shell level; no special `/pipe` — v2 candidate, DEF-03).
- `ulm telemetry ...` / `ulm daemon ...` subcommand surfaces — share the commander parser but owned by F-10 / future daemon.
- `--resume <id>` one-shot session resume (DEF-01 — coordinate with F-05).
- `--model <name>` one-shot model override (DEF-02 — coordinate with F-06).
- JSON output mode (DEF-03 — separate v2 candidate from `/pipe`).

## §3 Acceptance Criteria

- [ ] AC-01: Positional + `-p` → `ulm -p claude "summarize this"` invokes Claude transport with prompt verbatim; streams to stdout; exits 0 on success.
- [ ] AC-02: Stdin-piped — `echo "rewrite in french" | ulm -p gemini` reads stdin to EOF; trailing newline stripped; Gemini transport invoked; exits 0.
- [ ] AC-03: Positional + stdin concatenation per D-03 — `ulm -p claude "summarize this" < notes.txt` → transport receives positional + `\n\n` + stdin (trailing newline stripped).
- [ ] AC-04: `--` separator (§7.2) — `ulm -p claude -- --help me write a function` treats `"--help me write a function"` as the prompt; no usage text printed.
- [ ] AC-05: TTY stdin + no positional → `✗ E-CLI-NO-PROMPT: no prompt provided. Pass a positional argument, pipe stdin, or omit -p to enter REPL.` and exits non-zero. REPL is NOT entered when `-p` is set.
- [ ] AC-06: Empty piped stdin → `✗ E-CLI-NO-PROMPT: stdin is empty.` and exits non-zero (distinct from AC-05 for scripting diagnostics).
- [ ] AC-07: ANSI auto-off — `ulm -p claude "hi" | cat > out.txt` → `out.txt` contains zero ANSI escapes; `NO_COLOR=1 ulm -p claude "hi"` on a TTY also produces ANSI-free output; `FORCE_COLOR=1 ulm -p claude "hi" | cat` retains ANSI.
- [ ] AC-08: Env denylist parity with REPL — set `ANTHROPIC_API_KEY=leak`, `AWS_SECRET_ACCESS_KEY=leak`, `MY_TOKEN=leak`, `AWS_REGION=us-east-1`; mock provider dumps env; denylisted absent, `AWS_REGION` present.
- [ ] AC-09: No shell interpretation — `ulm -p mock-provider "$(rm -rf /tmp/canary)"` with canary pre-created → canary intact. Provider receives literal `$(rm -rf /tmp/canary)`. CI grep from §7.2 confirms no `spawn(..., { shell: true })` in `src/oneshot/`.
- [ ] AC-10: Exit-code mapping per D-01 — table-driven: mock exits 1 → ulm exits with `CliCrash` mapping (1); `ulm -p unknown "x"` → `InvalidProvider` mapping (2); claude not on PATH → `CliMissing` mapping (127); `ULM_TURN_TIMEOUT=1` + hung mock → `CliTimeout` mapping (124).
- [ ] AC-11: REPL + one-shot session coexistence (§5.2.1) — REPL sets `[sessions].claude = R1`; concurrent `ulm -p gemini "hi"` sets `[sessions].gemini = O1`; after both exit, both keys present. Run 10× to catch races.
- [ ] AC-12: One-shot does not start REPL — no readline interface created; no prompt prefix; no history touched. `~/.cache/ulm/history` mtime unchanged (or absent — history is in-memory per repl-shell D-03).
- [ ] AC-13: Invalid UTF-8 on stdin (D-02) → `✗ E-CLI-INVALID-UTF8: stdin contains invalid UTF-8 at byte N. ulm does not currently support non-UTF-8 prompts.` exits 2. Detection via `Buffer.from(buf).toString('utf8')` followed by re-encode comparison, or via the `'replacement character'` check on the strict decoder.

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | One-shot adds ≤ 50 ms exec / ≤ 10 ms ACP overhead (G-07). Cold-start (fresh `node bin/ulm.mjs` process) ≤ 80 ms p95 to first byte of provider output, excluding provider compute. Measured in `tests/bench/one_shot.ts` (tinybench). Note: tight under Node startup baseline (~30–60 ms); achievable via lazy imports and `node --no-warnings`. |
| Error budget | Mid-turn crash → `✗ E-CLI-CRASH: provider 'X' crashed (exit N).` to stderr; partial stdout already streamed left intact (not truncated); exits with §4.8-mapped non-zero code (D-01). Never hangs: hard wall-clock cap = `ULM_TURN_TIMEOUT + 2s` after which ulm exits `CliTimeout`. |
| Browser support | N/A |
| Quota enforcement | N/A |
| Accessibility | `process.stdout.isTTY` checked once at startup; cached. `NO_COLOR` / `FORCE_COLOR` / `--no-color` honored per §4.7. `--no-color` must work BEFORE `--` separator. |
| Security | Env denylist via shared `src/spawn/index.ts` (single source — provider-transport D-02 owns); argv array via `child_process.spawn(provider, ['-p', prompt], { shell: false })`; `--` separator documented in `--help` and in the `CliNoPrompt` hint. |
| Concurrency | Session-ID writeback via `stateStore.save(state => state.sessions[provider] = id)` — per-key callback mutation, never whole-file overwrite. |
| Stdin handling | Three states: TTY (`process.stdin.isTTY === true`) → no input; pipe + 0 bytes → empty; pipe + N>0 → use bytes. UTF-8 validated on read; invalid → `CliInvalidUtf8`. |
| Portability | Pure JS + `commander` (~50 KB packed). Runs on Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. |

## §5 Data Model

> Writes `[sessions].<provider>` via F-04 per-key merge — never owns whole-file save.

## §6 Interface Contracts

> Not applicable — `Applies` does not include `interface-contracts`. The CLI flag grammar is documented in this SPEC's ACs and in `ulm --help` (TC-20 snapshot). CLI grammar stability is version-pinned to `ulm --version` major-version compatibility.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit (vitest) | `parseArgs(["-p", "claude", "hello"])` | `{ provider: "claude", positional: "hello", noColor: false }` |
| TC-02 | Unit | `parseArgs(["-p", "claude", "--", "--help", "me"])` | Prompt = `"--help me"`; no help text printed |
| TC-03 | Unit | `combinePrompt("foo", "bar\n")` | Returns `"foo\n\nbar"` (separator inserted, trailing newline stripped) |
| TC-04 | Unit | Exit-code mapper for every §4.8 code | Table-driven asserts each code → expected exit int per D-01 |
| TC-05 | Integration | `ulm -p mock "hi"` with mock streaming 3 chunks | stdout = concatenated chunks; exit 0; stderr empty |
| TC-06 | Integration | `echo "x" \| ulm -p mock` | Mock receives prompt "x"; exit 0 |
| TC-07 | Integration | `ulm -p mock "pre" < <(printf "post")` | Mock receives `"pre\n\npost"`; exit 0 |
| TC-08 | Integration | `ulm -p mock` with stdin as TTY (via node-pty) | stderr `E-CLI-NO-PROMPT`; exit per D-01 NO_PROMPT mapping |
| TC-09 | Integration | `: \| ulm -p mock` (empty pipe) | stderr `E-CLI-NO-PROMPT: stdin is empty`; exit non-zero |
| TC-10 | Integration | Env denylist — `ANTHROPIC_API_KEY=leak`, mock dumps env | `ANTHROPIC_API_KEY` absent; `AWS_REGION` present if set |
| TC-11 | Integration | `ulm -p mock "hi" \| cat > out.txt; grep -c $'\x1B\\[' out.txt` | Returns 0 |
| TC-12 | Integration | `NO_COLOR=1 ulm -p mock "hi"` (PTY harness via node-pty) | stdout contains no ANSI |
| TC-13 | Integration | `FORCE_COLOR=1 ulm -p mock "hi" \| cat` | stdout contains ANSI |
| TC-14 | Integration | `ulm -p mock-crash "hi"` (mock exits 1 mid-stream) | stderr `E-CLI-CRASH`; exit per D-01; partial stdout preserved |
| TC-15 | Integration | `ULM_TURN_TIMEOUT=1 ulm -p mock-hang "hi"` | Exits within 3 s; stderr `E-CLI-TIMEOUT` |
| TC-16 | Integration | `ulm -p unknown "x"` | stderr `E-INVALID-PROVIDER`; exit per D-01 |
| TC-17 | Concurrency | vitest concurrent test — REPL task sets `[sessions].claude = "R1"`, one-shot task sets `[sessions].gemini = "O1"`, loop 10× | Final state.toml contains both keys; no throw; no leftover `state.toml.lock` |
| TC-18 | Security (CI grep) | `grep -rnE "spawn\([^)]*shell:\s*true" src/oneshot/` | 0 hits |
| TC-19 | Security (shell-injection corpus) | 20 prompts with `$()`, backticks, `;rm`, `&&` against mock with canary files | All canaries intact |
| TC-20 | Snapshot (vitest) | `ulm --help` output | `toMatchSnapshot()`; documents `--` separator |
| TC-21 | Stress | 100 concurrent one-shots against a REPL holding state.toml lock with varied cadences | All complete with consistent state.toml; quantifies Q-02 starvation risk |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-ulm.md §6 — F-07; §4.6, §7.2
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** [repl-shell, provider-transport, state-store, error-surfaces]

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | Argument parser — commander vs yargs vs hand-rolled | backend-lead | Resolved (2026-05-23) | `commander` v12 (D-04). ~50 KB packed, well under PRD G-06 install footprint; subcommand support free for future `ulm telemetry`/`ulm daemon`. |
| Q-02 | Behavior when state.toml is locked >150ms by a running REPL | backend-lead | Open | TC-17/TC-21 outcomes. If the 3×50ms F-04 retry sometimes fails under realistic load, escalate to a one-shot-specific retry budget. Resolve at F-04 implementation. |
| Q-03 | Should one-shot exit codes be remappable via env (e.g. `ULM_EXIT_CODE_TIMEOUT=99`)? | testing-lead | Open (lean No) | Adds surface area; YAGNI. Resolve at first user request, or 2026-08-15. |

## §10 Implementation Notes

- The "REPL + parallel one-shot" concurrency story (§5.2.1) is the most subtle test surface. F-04's per-key merge is what keeps this safe; this feature must save through that path, never a whole-file shortcut.
- Stdin handling must distinguish TTY (no input — AC-05), closed pipe (empty — AC-06), bytes present (use them).
- D-01 follows POSIX / GNU / sysexits.h conventions so shell scripts piping ulm get predictable signals: `if [ $? -eq 124 ]` works naturally for timeout.
- D-02 adds new `CliNoPrompt` and `CliInvalidUtf8` error classes to F-08's catalog (propagation to PRD §4.8 on next promotion cycle).
- Touches `src/spawn/index.ts` is the SHARED denylist function (owned by F-02 D-02), not a copy. Locked as a shared dependency so refactors can't quietly fork the list.
- Lazy imports matter for AC-04 cold-start: import F-02 transport modules only after `commander` parses; avoid top-level `import` of heavy modules.
