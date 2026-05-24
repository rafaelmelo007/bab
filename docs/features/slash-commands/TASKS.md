# Tasks — Slash Commands

**Feature:** slash-commands
**Source:** SPEC.md (14 ACs), DECISIONS.md (D-01..D-05), INTERFACE-CONTRACTS.md
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Scaffold `src/commands/types.ts` — `Handler` signature, `DispatchResult` union, `CommandRegistry` interface, `HELP_ORDER` const per INTERFACE-CONTRACTS.md §1 | backend-lead | High | Done | AC-03, AC-14 | D-04, D-05 |
| T-02 | Scaffold `src/commands/index.ts` exporting `dispatch(input: string, ctx: ReplContext) → Promise<DispatchResult>` | backend-lead | High | Done | AC-03 | — |
| T-03 | Implement tokenizer: `input.trim().split(/\s+/)` → `{ cmd, args }`; NO shell metacharacter interpretation | backend-lead | High | Done | AC-03 | — |
| T-04 | Add CI grep rule blocking `` `${cmd} ${args.join(' ')}` `` shell-style concatenation in `src/commands/` | security-specialist | Medium | Done | (NFR Security) | — |
| T-05 | Wire dispatch table mapping the 9 commands → handlers in F-02 / F-05 / F-06 per INTERFACE-CONTRACTS §1 table | backend-lead | High | Done | (AC framework) | D-04 |
| T-06 | Author `tests/fixtures/help_output.txt` containing the verbatim PRD §4.9 block | prompt-engineer | High | Done | AC-01 | D-02 |
| T-07 | Implement `helpRender()`: read `tests/fixtures/help_output.txt` (build-time via esbuild text loader, or runtime via `fs.readFileSync`) and emit; assert single trailing `\n` | backend-lead | High | Done | AC-01 | D-02 |
| T-08 | Implement `providersRender()` four-column layout per INTERFACE-CONTRACTS §3 + glyph fallback (consume F-08 helpers) | ux-specialist | High | Done | AC-08, AC-09 | — |
| T-09 | Implement `clearScreen()`: emit exactly `\x1B[2J\x1B[H` on TTY+UTF-8+color; emit nothing otherwise; never spawn subprocess | ux-specialist | Medium | Done | AC-13 | — |
| T-10 | Implement `exit()` returning `{ kind: 'exit', code: 0 }`; REPL loop honors within 50 ms | backend-lead | High | Done | AC-14 | — |
| T-11 | Add `fastest-levenshtein` (^1) dep to package.json | backend-lead | High | Done | AC-05 | D-01 |
| T-12 | Implement unknown-command surface: print `✗ unknown command: /<cmd>. Try /help.\n` | backend-lead | High | Done | AC-04 | — |
| T-13 | Implement "Did you mean" hint: scan known commands via `fastest-levenshtein`; emit `Did you mean /<closest>?` when min distance ≤ 2; tie-break by `HELP_ORDER` index (NOT lexical sort) | backend-lead | High | Done | AC-05, AC-06, AC-07 | D-03 |
| T-14 | Add CI grep rule blocking `.sort()` in `src/commands/suggest.ts` (D-03 tie-break invariant) | testing-lead | Medium | Done | AC-07 | D-03 |
| T-15 | Implement `NoProvider` pre-check: non-slash input before any `/provider` is set → throw F-08 `NoProvider`, never reach F-02 | backend-lead | High | Done | AC-10 | — |
| T-16 | Implement `/provider <name>` passthrough to F-02 handler with `args=["<name>"]` (no dispatcher-side validation) | backend-lead | High | Done | AC-11 | D-04 |
| T-17 | Implement G-04 cap enforcement: vitest unit test counts `^\s*\/\w+/m` lines in `/help` output; assert ≤ 12 (currently 9) | testing-lead | High | Done | AC-02 | — |
| T-18 | Write vitest unit test asserting `/help` byte-equality vs `tests/fixtures/help_output.txt` | testing-lead | High | Done | TC-01, AC-01 | D-02 |
| T-19 | Write vitest unit tests for tokenizer (TC-03), unknown command no-match (TC-04), Lev=1 hint (TC-05), Lev=2 hint (TC-06), Lev=3 no-hint (TC-07) | testing-lead | High | Done | TC-03..TC-07 | — |
| T-20 | Write vitest unit test asserting tie-break uses `HELP_ORDER` index, not lexical sort (mock suggestor with two equidistant candidates) | testing-lead | High | Done | TC-08 | D-03 |
| T-21 | Write `/providers` byte-exact snapshot test against fixture matching §4.9.2 | testing-lead | High | Done | TC-09 | — |
| T-22 | Author `tests/fixtures/providers_ascii.txt`; write `LANG=C` test asserting ASCII fallback (`[ok]`/`[!]`/`[err]`/`-`) | testing-lead | Medium | Done | TC-10 | — |
| T-23 | Write vitest test asserting no `\x1B\[` bytes in any command output under `NO_COLOR=1` | testing-lead | Medium | Done | TC-11 | — |
| T-24 | Write integration test asserting F-02 mock receives zero `spawn()` calls when non-slash input is sent before `/provider`; F-08 emits `NoProvider` | testing-lead | High | Done | TC-12, AC-10 | — |
| T-25 | Write integration test asserting `/provider foo` reaches F-02 handler with `args === ["foo"]` (dispatcher doesn't validate) | testing-lead | Medium | Done | TC-13, AC-11 | — |
| T-26 | Write fast-check property test: 1000 random `/...` inputs never throw, never exit, all reprompt | testing-lead | High | Done | TC-14, AC-12 | — |
| T-27 | Write vitest test asserting `/clear` emits bytes `\x1B[2J\x1B[H` | testing-lead | Medium | Done | TC-15, AC-13 | — |
| T-28 | Write vitest test asserting `/exit` returns `{ kind: "exit", code: 0 }` | testing-lead | Medium | Done | TC-16, AC-14 | — |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
