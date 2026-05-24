# Decisions — One-Shot Mode

**Feature:** one-shot-mode
**Source:** /vskit:critique-spec one-shot-mode (2026-05-23, self-review via general-purpose agent playing backend-lead + security-specialist + testing-lead + prompt-engineer lenses); Node.js retrofit 2026-05-23 after PRD §13 Q-06 flipped Rust → Node.js.
**Last updated:** 2026-05-23

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | backend-lead, testing-lead | Exit-code mapping for every §4.8 error code | 0 = success; 1 = generic / `CliCrash` / `HttpTimeout`; 2 = `CliNoPrompt` / `InvalidProvider` / `NoProvider` (usage); 124 = `CliTimeout` (matches GNU `timeout(1)`); 126 = `CliUnauth` (POSIX "found but not executable"); 127 = `CliMissing` (POSIX "command not found"); 74 = `StateCorrupt` / `StateLocked` (after retry exhaustion) / `StateSchema` (sysexits `EX_IOERR`); 77 = `Perms` (sysexits `EX_NOPERM`); 69 = `AcpProtocol` (sysexits `EX_UNAVAILABLE`); 2 = `CliInvalidUtf8`. Implementation in `src/oneshot/exitCodes.ts` as a single switch, table-tested by TC-04. | Follows established POSIX / GNU / sysexits.h conventions so shell scripts piping `bab` get predictable signals. | SPEC §3 AC-10; SPEC §4 Error budget; F-08 INTERFACE-CONTRACTS exit-code table | — |
| D-02 | 2026-05-23 | testing-lead | Behavior on invalid UTF-8 in piped stdin | Add new `CliNoPrompt` and `CliInvalidUtf8` error classes to F-08's catalog (propagate to PRD §4.8 next promotion cycle). Print `✗ E-CLI-INVALID-UTF8: stdin contains invalid UTF-8 at byte N. bab does not currently support non-UTF-8 prompts.` Exit code 2 (usage). Detection: read stdin as `Buffer`, attempt `buf.toString('utf8')` + re-encode + byte-compare; or use `TextDecoder('utf-8', { fatal: true })` which throws on invalid sequences. | All provider CLIs expect UTF-8; passing raw bytes risks the provider mojibake'ing the prompt. Fail loud per INV-3. | PRD §4.8 (next promotion); F-08 catalog + INTERFACE-CONTRACTS.md; SPEC §3 AC-13 | — |
| D-03 | 2026-05-23 | backend-lead | Combination order when both positional and stdin present | Positional first, then literal `\n\n`, then stdin (trailing newline stripped). Documented in `--help`. | Mirrors the ergonomic pattern (`bab -p X "summarize:" < file.txt`); user's intent is "instruction + body". | SPEC §3 AC-03; `--help` text | — |
| D-04 | 2026-05-23 | backend-lead | Argument parser choice (resolves §9 Q-01) | `commander` v12 | Established Node CLI parser with first-class `--` separator support, subcommand routing (free for future `bab telemetry`/`bab daemon`), and `--help` snapshot testing. ~50 KB packed — well under G-06 install footprint. yargs has more features but ~3× larger; hand-rolling consumes ~3 days for marginal savings and zero correctness wins. Re-evaluate only if portfolio install footprint crosses 6 MB. | SPEC §9 Q-01 resolved; TASKS.md (commander dep) | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | `bab -p X --resume <id> "prompt"` one-shot session resume | F-05 session-management owns resume semantics; cross-feature integration cleaner after F-05 lands | F-05 reaches AC-complete |
| DEF-02 | `bab -p X --model <name> "prompt"` one-shot model override | Same plumbing as `/model` REPL command (F-06); defer until F-06 stabilizes its model-override API | F-06 AC-complete |
| DEF-03 | JSON-output mode (`bab --json -p X "prompt"`) for tooling | Out-of-scope for v1; raise as v2 candidate | Telemetry shows ≥ 10% one-shot users requesting machine output |
| DEF-04 | Multi-line prompt via heredoc with embedded ANSI | Edge case; heredoc into stdin works today | First user issue filed |
