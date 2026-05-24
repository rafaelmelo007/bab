# Decisions — Slash Commands

**Feature:** slash-commands
**Source:** /vskit:critique-spec slash-commands (2026-05-23, self-review via general-purpose agent playing backend-lead + ux-specialist + testing-lead + prompt-engineer lenses); Node.js retrofit 2026-05-23 after PRD §13 Q-06 flipped Rust → Node.js.
**Last updated:** 2026-05-23

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | backend-lead | Levenshtein library (resolves Q-01) | `fastest-levenshtein` npm package | ~2 KB packed, zero deps, MIT, faster than alternatives on short strings (slash commands are 4–10 chars). Hand-roll is YAGNI for v1; aligns with §7.2 supply-chain by being a tiny audited dep. | SPEC §9 Q-01 resolved; SPEC §10 | — |
| D-02 | 2026-05-23 | testing-lead | `/help` source of truth: SPEC-embedded string vs fixture file | Fixture file `tests/fixtures/help_output.txt`; SPEC §6, INTERFACE-CONTRACTS, PRD §4.9, and source code all reference it. Source code reads via build-time esbuild text loader or runtime `fs.readFileSync(import.meta.url + '/../fixtures/help_output.txt')`. | Single point of edit. Drift between PRD/SPEC/code is the chronic risk of a "frozen string"; one file pins all three. | SPEC §6, §10; INTERFACE-CONTRACTS.md; PRD §4.9 footnote (next promotion cycle) | — |
| D-03 | 2026-05-23 | backend-lead | Tie-break implementation strategy | Static `const HELP_ORDER = [...] as const;` array; reducer with min-by `[distance, HELP_ORDER.indexOf(c)]`. CI grep blocks `.sort()` in suggestion path. | Lexical tie-break (alphabetical-by-name) is the surprising default of `Array.prototype.sort`; the SPEC explicitly says by-help-order. Encoding as `const` makes it impossible to mis-implement. | SPEC §10; AC-07; TC-08 | — |
| D-04 | 2026-05-23 | backend-lead | Dispatch seam with F-02 / F-05 / F-08 | Dispatch table maps command-name → `(args: string[], ctx: ReplContext) => DispatchResult`; F-06 owns the table, handlers live in F-02 (`providerSet`, `modelOverride`), F-05 (`sessionNew`, `sessionList`, `sessionResume`), F-06 itself (`help`, `clear`, `exit`, `providersRender`). Handlers throw F-08 `BabError` subclasses on failure. | Keeps F-06 thin (registry + dispatch only). Each feature owns its handler. F-08 errors are the sole error vocabulary. | SPEC §6; INTERFACE-CONTRACTS.md | — |
| D-05 | 2026-05-23 | prompt-engineer | `Applies` field — opt into `interface-contracts`? | Yes — add `interface-contracts` | Dispatch signature (D-04) is a load-bearing API between four features. Tracking it in INTERFACE-CONTRACTS.md is exactly what that aspect is for. | SPEC frontmatter `Applies:`; SPEC §6; new file INTERFACE-CONTRACTS.md | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | Tab completion for slash commands | PRD §4.7 explicit v2 candidate; G-04 minimal surface | After v1 release, if user feedback prioritizes |
| DEF-02 | `/feedback` and `/pipe` commands | PRD §15 v2 candidates | v2 scope review |
| DEF-03 | Localization / i18n of `/help` and error messages | English-only OK for v1; no signal yet | Post-v1 if non-English issue volume warrants |
| DEF-04 | Subcommand parsing beyond positional argv (e.g. `/model save`, `/telemetry enable` argument shapes) | v1 uses positional only; `args[0]` is the subcommand. Handlers parse their own subcommands. | If subcommand surface grows past 3 verbs per command |
