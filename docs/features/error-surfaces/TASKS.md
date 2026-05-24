# Tasks — Error Surfaces

**Feature:** error-surfaces
**Source:** SPEC.md (24 ACs), DECISIONS.md (D-01..D-08), INTERFACE-CONTRACTS.md
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Scaffold `src/errors/index.ts` — declare `UlmErrorCode` union + `RenderOpts` + abstract `UlmError` per INTERFACE-CONTRACTS.md §1 | backend-lead | High | Done | AC-01..AC-13 | D-08 |
| T-02 | Implement 13 concrete error subclasses (CliMissing, CliUnauth, CliCrash, CliTimeout, AcpProtocol, HttpTimeout, InvalidProvider, NoProvider, StateLocked, StateCorrupt, StateSchema, ProviderVersion, Perms) with constructor params per INTERFACE-CONTRACTS.md §2 | backend-lead | High | Done | AC-01..AC-13 | — |
| T-03 | Implement `UlmError.format(opts)` rendering exact §4.8 templates byte-for-byte; table-driven test fixture per template | backend-lead | High | Done | AC-01..AC-13 | — |
| T-04 | Implement TTY/color resolution helper: `process.stdout.isTTY` + `NO_COLOR` + `FORCE_COLOR` + `--no-color` flag with the §5 INTERFACE-CONTRACTS precedence order | ux-specialist | High | Done | AC-14, AC-15 | — |
| T-05 | Implement Unicode resolution helper: `process.env.LANG`/`LC_ALL` UTF-8 detection + Windows legacy console probe (`WT_SESSION` absent + cmd.exe parent) | ux-specialist | Medium | Done | AC-14 | — |
| T-06 | Inline ANSI palette helper (no `chalk` dep): SGR 31 / 33 / 1 emitter; bypassed when `color=false` | ux-specialist | Medium | Done | AC-14, AC-16 | D-04 |
| T-07 | Implement `UlmError.exitCode()` switch returning per-variant integers per INTERFACE-CONTRACTS.md §3 (consumed by F-07) | backend-lead | High | Done | AC-24 | — |
| T-08 | Implement `isWarning()` returning true only for `ProviderVersion`; verified by AC-12 (exit 0) | backend-lead | Medium | Done | AC-12 | — |
| T-09 | Implement `StateLocked` coalesce behavior: first retry prints once, subsequent silent, final exhaustion prints `E-STATE-LOCK-FAILED` | backend-lead | Medium | Done | AC-09 | D-02 |
| T-10 | Scaffold `src/redact/index.ts` — export `scrub`, `scrubWith`, `REDACT_VERSION` per INTERFACE-CONTRACTS.md §4 | security-specialist | High | Done | AC-17..AC-21 | — |
| T-11 | Implement 4 default redaction patterns: Bearer, Authorization, OAuth refresh URLs, Basic; combine into a `RegExp[]` with `/g`/`/gm` flags as needed | security-specialist | High | Done | AC-17..AC-20 | — |
| T-12 | Implement `ULM_REDACT_EXTRA` env parsing: comma-separated regex list, invalid regex warns once and falls back to defaults (additive only per D-03) | security-specialist | High | Done | AC-21 | D-03 |
| T-13 | Wire defense-in-depth: route ulm's own stderr (via `console.error` override or `pino` transport) through `scrub()` before write | security-specialist | High | Done | AC-15 (indirectly) | D-05 |
| T-14 | Seed negative-test corpus: capture 60 days of provider stderr per D-01; commit ≥ 200 lines to `tests/redact/corpus/<provider>/` with `MANIFEST.md` recording collection date + provider version + prompt hash | testing-lead | High | Done | AC-22 | D-01 |
| T-15 | Seed positive-test corpus: ≥ 50 known-credential lines (Bearer, Authorization, Basic, OAuth refresh URLs) in `tests/redact/positives/` | testing-lead | High | Done | AC-23 | — |
| T-16 | Implement CI gate script: count `[REDACTED]` substitutions in negative corpus, fail if > floor(0.01 × line_count) | testing-lead | High | Done | AC-22 | — |
| T-17 | Write vitest table-driven test for all 13 UlmError variants vs §4.8 templates | testing-lead | High | Done | TC-01 | — |
| T-18 | Write 8-combo vitest matrix for NO_COLOR × TTY × UTF-8 fallback | testing-lead | High | Done | TC-09, AC-14 | — |
| T-19 | Write fast-check property tests for redactor: never emits unredacted credential under any default + extra pattern combination | testing-lead | Medium | Done | TC-11 | — |
| T-20 | Write vitest snapshot tests for full output of each of the 13 codes on TTY+UTF-8 (`toMatchSnapshot()`) | testing-lead | Medium | Done | TC-12 | — |
| T-21 | Write integration test spawning `ulm -p invalid` etc. via `node:child_process` and asserting `code` callback value matches D-01 table | testing-lead | Medium | Done | TC-10, AC-24 | D-01 |
| T-22 | Wire `REDACT_VERSION` constant into F-10 telemetry `error_<code>` event_data per §10.2 allowlist | backend-lead | Low | Done | — | D-07 |
| T-23 | Stub INTERFACE-CONTRACTS export surface (re-export `UlmError`, subclasses, `RenderOpts`, `scrub`, `REDACT_VERSION`) — pinned API for F-02/F-05/F-06/F-07 to lock against | prompt-engineer | High | Done | — | D-06 |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
