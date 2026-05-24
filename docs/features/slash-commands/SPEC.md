# Slash Commands — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** High
**Applies:** [interface-contracts]
**Touches:** [src/commands/**]
**Prototype:** N/A
**Agents:** backend-lead, ux-specialist, testing-lead
**Source:** docs/prds/2026-05-23-bab.md §6 — F-06; §4.5, §4.7, §4.9, §4.9.2, §4.8
**Last updated:** 2026-05-23

---

## §1 Problem Statement

bab's UX is built on ten slash commands (G-04 cap of 12) — `/provider`, `/providers`, `/new`, `/sessions`, `/resume`, `/model`, `/clear`, `/help`, `/exit`, plus implicit Ctrl-D. This feature owns the parsing and dispatch layer: tokenizes a line that starts with `/`, looks up the handler, surfaces an "unknown command" with a Levenshtein-≤-2 hint per §4.7, and renders `/help` and `/providers` byte-exact per §4.9 / §4.9.2. The dispatch table is a load-bearing API between F-02, F-05, F-06, F-08 — pinned in [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md).

## §2 Scope

### In Scope
- Tokenizer for `/<cmd> [arg1] [arg2]…` lines (whitespace split via `String.prototype.split(/\s+/)` only — no shell interpolation, no quoting).
- Dispatch table: command-name → `(args: string[], ctx: ReplContext) => DispatchResult` (D-04). Registry lives in F-06; handlers live in F-02 (`provider_*`), F-05 (`session_*`), F-06 itself (`help`, `clear`, `exit`, `providers`).
- `/help` — print verbatim §4.9 block from `tests/fixtures/help_output.txt` via `fs.readFileSync` (D-02 single-source-of-truth fixture, `include`-style via build-time inline or runtime read).
- `/providers` — render §4.9.2 four-column layout (name, status glyph, version, transport).
- `/provider` (no arg) — show current provider; `/provider <name>` delegates to F-02.
- `/clear` — emits `ESC[2J ESC[H` (`\x1B[2J\x1B[H`), suppressed under NO_COLOR / non-TTY.
- `/exit` — clean shutdown, returns `{ kind: 'exit', code: 0 }`.
- Unknown command: `✗ unknown command: /foo. Try /help.` + `Did you mean /<closest>?` when Levenshtein ≤ 2 (tie-break by static `HELP_ORDER` array index — D-03).
- `/model <name>` — override active model for the current provider; delegates to F-02.
- G-04 cap enforced by unit test parsing `/help` output.
- ASCII fallback for `✓ ⚠ ✗` and em-dash per §4.7.

### Out of Scope
- REPL loop, prompt prefix, line editing — F-01.
- Session-management bodies (`/new`, `/sessions`, `/resume`) — F-05 (this feature dispatches, F-05 implements).
- Provider transport invocation — F-02.
- Error catalog formatting — F-08 (this feature throws `BabError` subclasses, F-08 formats).
- Tab completion (§4.7 explicit v2 candidate; DEF-01).
- `/feedback` and `/pipe` v2 candidates (DEF-02).
- i18n / localization (DEF-03).

## §3 Acceptance Criteria

- [ ] AC-01: `/help` invocation prints byte-for-byte the §4.9 block from `tests/fixtures/help_output.txt`, terminated by exactly one trailing `\n`. Snapshot-tested via vitest against the fixture file.
- [ ] AC-02: G-04 cap enforced — unit test counts lines in `/help` matching `^\s*\/[a-z]+`, asserts `count ≤ 12` (today: 9).
- [ ] AC-03: Tokenizer rejects shell metacharacters as syntax — `parse("/x ; y")` returns `{ cmd: "x", args: [";", "y"] }`. No separator interpretation of `;`, `&`, `|`, `` ` ``, `$()`, `>`, `<`.
- [ ] AC-04: Unknown command with no near match — `dispatch("/zzzzz")` produces `✗ unknown command: /zzzzz. Try /help.\n` exactly, no hint line.
- [ ] AC-05: Unknown command Lev=1 — `dispatch("/halp")` includes `Did you mean /help?` on its own line directly after the error.
- [ ] AC-06: Levenshtein threshold — `dispatch("/provxxxxx")` (dist > 2 from all) produces no hint.
- [ ] AC-07: Tie-break uses `HELP_ORDER` (D-03), not lexical sort — two equidistant candidates resolve to whichever appears earlier in the static help-order array.
- [ ] AC-08: `/providers` byte-exact match against §4.9.2 example for the mock state (`claude=✓ 1.4.2 acp`, `codex=✓ 0.8.1 exec`, `gemini=⚠ 0.5.0 exec (below minimum 0.6.0)`, `ollama=✗ — —`).
- [ ] AC-09: `NO_COLOR=1` + `LANG=C` — `/providers` renders `[ok]`/`[!]`/`[err]` instead of glyphs; em-dash becomes `-`; no ANSI escape bytes in stdout (regex `/\x1B\[/` returns no match).
- [ ] AC-10: Non-slash input submitted before any `/provider` is set never reaches F-02; F-08's `NoProvider` is thrown via the dispatcher's pre-check. F-02 mock asserts zero spawn calls.
- [ ] AC-11: `/provider foo` invokes the registered handler with `args=["foo"]`; the dispatcher does not validate provider names — F-02's handler throws `InvalidProvider`.
- [ ] AC-12: Property test (fast-check) — 1000 random `/...` inputs (incl. empty `/`, `/ `, `//`, UTF-8, 3000-char) all return control to REPL with `E-*` or unknown-command message; no uncaught throw, no non-zero exit.
- [ ] AC-13: `/clear` emits exactly `\x1B[2J\x1B[H` on TTY+UTF-8+color; emits nothing under NO_COLOR / non-TTY; never spawns a subprocess.
- [ ] AC-14: `/exit` returns `{ kind: 'exit', code: 0 }` and the REPL honors it within 50 ms.

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | Dispatch (parse → handler invocation) ≤ 5 ms; `/help` render ≤ 10 ms; `/providers` render ≤ 15 ms (extra width for glyph fallback). |
| Error budget | Unknown command never crashes REPL — always falls back to error + reprompt. Uncaught throw in dispatcher path is a CI-blocking bug. |
| Browser support | N/A |
| Quota enforcement | N/A |
| Accessibility | `/help` is pure ASCII (no glyphs by design per §4.9). `/providers` glyphs (`✓ ⚠ ✗`) carry adjacent status text and downgrade to `[ok] [!] [err]` per §4.7 when `LANG`/`LC_ALL` lacks UTF-8 or `NO_COLOR=1`. Em-dash `—` downgrades to `-`. |
| Security | Argv-only tokenization. Whitespace split is the **only** parsing step — no quote handling, no escape sequences, no env expansion. Args passed as `string[]`, never joined into a shell string. CI grep asserts no `` `${cmd} ${args.join(' ')}` `` shell-style concatenation in `src/commands/`. |
| Determinism | Tie-break in "Did you mean" is **deterministic and order-stable**: ties resolved by index in the static `HELP_ORDER` array, not by lexical sort. CI grep blocks `.sort()` in the suggestion path. |
| Portability | Pure JS + `fastest-levenshtein` (~2 KB, zero deps). Runs on Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. |

## §5 Data Model

> Not applicable.

## §6 Interface Contracts

Dispatch table signature is pinned in [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md) per D-04. The `/help` and `/providers` byte-exact outputs are also pinned there (both reference the §4.9 / §4.9.2 PRD sections as source-of-truth, with the fixture file path).

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit (vitest) | `/help` verbatim match | `output === fs.readFileSync("tests/fixtures/help_output.txt", "utf8")` (byte-exact) |
| TC-02 | Unit | G-04 cap enforced | count of `/^\s*\/\w+/m` matches in `/help` ≤ 12, === 9 today |
| TC-03 | Unit | Tokenizer rejects shell metacharacters | `parse("/x ; y").args.deep.equals([";", "y"])` |
| TC-04 | Unit | Unknown command, no near match | `dispatch("/zzzzz")` returns string `"✗ unknown command: /zzzzz. Try /help.\n"` |
| TC-05 | Unit | Unknown command, Lev=1 → hint | `dispatch("/halp")` includes `"Did you mean /help?"` |
| TC-06 | Unit | Unknown command, Lev=2 → hint | `dispatch("/proider")` (Lev=1) AND `dispatch("/proviiders")` (Lev=2) both hint |
| TC-07 | Unit | Unknown command, Lev=3 → no hint | `dispatch("/xxxxx")` has no `"Did you mean"` substring |
| TC-08 | Unit | Tie-break uses `HELP_ORDER` | Mock suggestor with two equidistant candidates; suggestion = earlier in `HELP_ORDER` |
| TC-09 | Unit | `/providers` byte-exact | Snapshot test against fixture matching §4.9.2 |
| TC-10 | Unit | `/providers` ASCII fallback | `LANG=C` → glyphs become `[ok] [!] [err]`, em-dash → `-`, matches `tests/fixtures/providers_ascii.txt` |
| TC-11 | Unit | `NO_COLOR` strips ANSI | `NO_COLOR=1` → no `/\x1B\[/` matches in any command output |
| TC-12 | Integration | Dispatch → F-08 NoProvider seam | Non-slash input before `/provider`; F-02 mock receives zero `spawn` calls; `NoProvider` thrown |
| TC-13 | Integration | `/provider foo` passthrough to F-02 | F-02 handler receives `args === ["foo"]`; dispatcher does not validate |
| TC-14 | Property (fast-check) | Fuzz slash inputs | 1000 random `/...` — none throw, none exit, all reprompt |
| TC-15 | Unit | `/clear` emits exactly `\x1B[2J\x1B[H` | output bytes === `"\x1B[2J\x1B[H"` |
| TC-16 | Unit | `/exit` returns clean shutdown signal | dispatcher returns `{ kind: "exit", code: 0 }`; REPL loop honors |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-bab.md §6 — F-06; §4.5, §4.7, §4.9, §4.9.2
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Interface Contracts:** [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** [repl-shell, error-surfaces]

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | Levenshtein library — `fastest-levenshtein` vs `js-levenshtein` vs hand-rolled? | backend-lead | Resolved (2026-05-23) | `fastest-levenshtein` (D-01). ~2 KB packed, zero deps, MIT, faster than `js-levenshtein` on short strings. |
| Q-02 | `/help` fixture file location — feature-local or cross-feature `docs/contracts/`? | prompt-engineer | Open | Promote to `docs/contracts/` if F-07 one-shot-mode reuses for `bab --help`; else feature-local. Resolve at F-07 implementation. |

## §10 Implementation Notes

- The `/help` string is frozen by §4.9 and unit-tested verbatim against a single fixture file (`tests/fixtures/help_output.txt`) which the source reads at build time (esbuild's loader `text` or runtime `fs.readFileSync`). One file pins all three (PRD, SPEC, code) per D-02.
- D-03 tie-break uses `const HELP_ORDER = ["/provider", "/providers", "/new", "/sessions", "/resume", "/model", "/clear", "/help", "/exit"] as const;` with `candidates.reduce((best, c) => /* min by [distance, HELP_ORDER.indexOf(c)] */)`. Lexical sort would be the surprising default of `Array.prototype.sort`.
- `/model save` (PRD §13 Q-04 resolution) persists the override into `[preferences].default_models` via F-04.
- Dispatcher is the security choke-point: argv-only, no shell interpolation. Every handler receives `string[]` — never a joined string.
- Implementation: TypeScript per PRD §13 Q-06 (Node.js). `fastest-levenshtein` is the only npm dep; everything else is built-ins.
