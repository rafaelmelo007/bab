# Error Surfaces — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** High
**Applies:** [interface-contracts]
**Touches:** [src/errors/**, src/redact/**]
**Prototype:** N/A
**Agents:** backend-lead, security-specialist, ux-specialist, testing-lead
**Source:** docs/prds/2026-05-23-ulm.md §6 — F-08; §4.8, §7.2 (log redaction), §4.7 (NO_COLOR + ASCII)
**Last updated:** 2026-05-23

---

## §1 Problem Statement

Every failure surface in ulm — transport (F-02), session-management (F-05), slash-commands (F-06), one-shot (F-07), state-store (F-04) — must format errors the same way so a user can grep, alias, and recognize them across modes. PRD §4.8 catalogs 13 codes (`E-CLI-MISSING`, `E-ACP-PROTOCOL`, `E-STATE-LOCKED`, …) with fixed message templates. This feature delivers a small TypeScript module: a `UlmError` class hierarchy covering all 13 codes, an ANSI-aware formatter honoring `NO_COLOR` and TTY detection, the credential-redaction patterns from §7.2 (Bearer, Authorization, OAuth refresh URLs, Basic auth), exit-code mapping for one-shot mode, and a CI-tested negative corpus that keeps the redactor's false-positive rate under 1%. The PRD contract is that **errors never crash the REPL** — they return to the prompt.

## §2 Scope

### In Scope
- `UlmError` class hierarchy (or discriminated-union type) covering all 13 §4.8 codes; `format(opts)` method producing `✗ <CODE>: <human message>` with ASCII fallback (`[err] <CODE>: <msg>`) per §4.7.
- ANSI palette: SGR 31 (red) for `✗`, SGR 33 (yellow) for `⚠`, SGR 1 (bold) on the code prefix; 8-color only (no 256-color, no truecolor).
- `NO_COLOR`, `FORCE_COLOR`, `--no-color`, UTF-8/ASCII fallback per §4.7. TTY detection via `process.stdout.isTTY` + locale check on `process.env.LANG` / `LC_ALL`.
- Credential redaction module (`src/redact/index.ts`) with the four default patterns from §7.2; additive-only `ULM_REDACT_EXTRA` env extension (no way to disable defaults); pattern version constant `REDACT_VERSION` bumped per change.
- Negative-corpus FPR < 1% gate (corpus ≥ 200 lines) + positive-corpus 100% TPR gate (corpus ≥ 50 lines) in `tests/redact/`.
- Exit-code mapping table for one-shot mode (consumed by F-07 per its D-01).
- Defense-in-depth: ulm's own stderr (not only subprocess stderr) is routed through the redactor.
- INTERFACE-CONTRACTS.md pins the `UlmError` shape so F-02/F-05/F-06/F-07 can lock against it.

### Out of Scope
- Recovery logic per code — each consuming feature decides whether to retry/fallback/surface; Q-05 resolved in PRD §13: fail loud, no retry, no silent fallback.
- Crash reporting transport (Q-09 open) — F-10 telemetry will hook in later.
- Structured logging — ulm does not log to a file by default in v1.
- i18n / localization — English-only in v1; non-English locales are DEF-01 territory.
- Stdout redaction — Q-03 open until provider stdout leakage is observed; v1 defaults to stderr-only.

## §3 Acceptance Criteria

> Each AC must be independently verifiable. Mark `[x]` when test passes.

**Error catalog (one AC per §4.8 code — 13 codes):**

- [ ] AC-01: `new UlmError.CliMissing(provider, docUrl).format()` renders exactly `✗ E-CLI-MISSING: provider 'X': not installed. Install: <doc URL>` on TTY+UTF-8+color; one-shot exit code 127 (per F-07 D-01).
- [ ] AC-02: `CliUnauth(provider)` renders exactly `✗ E-CLI-UNAUTH: provider 'X' not authenticated. Run: X login`; one-shot exit 126.
- [ ] AC-03: `CliCrash(provider, exitCode)` renders exactly `✗ E-CLI-CRASH: provider 'X' crashed (exit N). Output above may be partial.`; one-shot exit 1.
- [ ] AC-04: `CliTimeout(provider, seconds)` renders exactly `✗ E-CLI-TIMEOUT: provider 'X' timed out after Ns. Set ULM_TURN_TIMEOUT to extend.`; one-shot exit 124.
- [ ] AC-05: `AcpProtocol(provider, detail)` renders exactly `✗ E-ACP-PROTOCOL: provider 'X' ACP error: <detail>. Falling back to exec mode this turn.`; does not abort one-shot — caller decides; one-shot exit 69 if surfaced as terminal.
- [ ] AC-06: `HttpTimeout()` renders exactly `✗ E-HTTP-TIMEOUT: ollama timeout after 30s. Is the daemon running?`; one-shot exit 1.
- [ ] AC-07: `InvalidProvider(name)` renders exactly `✗ E-INVALID-PROVIDER: unknown provider 'foo'. Valid: claude, codex, gemini, ollama`; one-shot exit 2.
- [ ] AC-08: `NoProvider()` renders exactly `✗ E-NO-PROVIDER: no provider selected. Run: /provider <name>`; one-shot exit 2.
- [ ] AC-09: `StateLocked` coalesces retries — prints `another ulm process is writing state. Retrying...` once on first contention, then `E-STATE-LOCK-FAILED` if all 3 attempts fail (per D-02); final exit 74.
- [ ] AC-10: `StateCorrupt(path)` renders exactly `✗ E-STATE-CORRUPT: <path> is corrupt. Move it aside and re-run.`; exit 74.
- [ ] AC-11: `StateSchema(found, supported)` renders exactly `✗ E-STATE-SCHEMA: state.toml is from a newer ulm (vN, this is vM). Upgrade ulm or use ULM_CONFIG_DIR.`; exit 74.
- [ ] AC-12: `ProviderVersion(provider, found, minimum)` is a **warning**, renders `⚠ E-PROVIDER-VERSION: provider 'X' is vN, minimum vM. Some features may not work.`; does not block; exit 0.
- [ ] AC-13: `Perms(path)` renders exactly `✗ E-PERMS: state.toml has insecure permissions. Run: chmod 0600 <path>`; exit 77.

**Formatting / fallback (§4.7):**

- [ ] AC-14: With any of `NO_COLOR=1`, non-TTY stdout (`!process.stdout.isTTY`), or `--no-color`, output strips all ANSI escapes; glyph remains UTF-8 `✗`/`⚠` if locale supports UTF-8, else `[err]`/`[!]`. Test matrix: 8 combinations of (`NO_COLOR`, TTY, UTF-8 locale).
- [ ] AC-15: With `FORCE_COLOR=1` on a non-TTY, ANSI is emitted (overrides auto-disable).
- [ ] AC-16: `stripAnsi(rendered) === renderNoColor(input)` for every code — no information conveyed only by color.

**Redaction (§7.2):**

- [ ] AC-17: `Bearer abc123_-.xyz` in stderr is replaced with `[REDACTED]` before printing (regex `Bearer [A-Za-z0-9._-]+`).
- [ ] AC-18: `Authorization: Bearer xyz` and `Authorization: anything` are line-anchored-replaced with `[REDACTED]` (regex `Authorization: .*`).
- [ ] AC-19: URLs of shape `https://host/path?access_token=…` and `https://host/path?foo=1&refresh_token=…` are replaced with `[REDACTED]` (regex `https://.*[?&](access_token|refresh_token)=`).
- [ ] AC-20: `Basic <≥20-char-base64>` headers are replaced with `[REDACTED]` (regex `Basic [A-Za-z0-9+/=]{20,}`); `Basic short` (<20 chars) passes through.
- [ ] AC-21: `ULM_REDACT_EXTRA="<r1>,<r2>"` adds patterns on top of defaults (additive only — no way to disable defaults per D-03); invalid regex warns at startup but defaults still apply.
- [ ] AC-22: Negative-corpus FPR < 1% measured on ≥ 200 clean lines in `tests/redact/corpus/`; CI gate fails if FP count > 2.
- [ ] AC-23: Positive-corpus TPR = 100% on ≥ 50 known-credential lines in `tests/redact/positives/`.

**Exit-code mapping:**

- [ ] AC-24: `ulmError.exitCode()` returns the table mapping documented above; mapping owned by F-07 D-01 and consumed here; table-tested.

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | Format + redact + print ≤ 2 ms for ≤ 10 KB payload; p99 ≤ 10 ms. Keeps §7.1 G-07 50 ms turn budget intact. |
| Error budget | Redaction FPR < 1% on negative corpus of ≥ 200 lines; CI gate fails if FP count > 2. TPR = 100% on positive corpus of ≥ 50 lines. |
| Browser support | N/A |
| Quota enforcement | N/A |
| Accessibility | ANSI auto-off on `NO_COLOR` / non-TTY / `--no-color`; `FORCE_COLOR` overrides; UTF-8/ASCII fallback per §4.7; no information conveyed only by color (every `✗`/`⚠` carries adjacent code text per §7.3). |
| Security | Default patterns: `Bearer …`, `Authorization: .*`, `https://…[?&](access_token\|refresh_token)=`, `Basic [A-Za-z0-9+/=]{20,}`. `ULM_REDACT_EXTRA` additive only (D-03). Pattern version recorded in `REDACT_VERSION` constant; logged in telemetry's `error_<code>` event (version int only, never the patterns themselves). Defense-in-depth: ulm's own stderr also routed through the redactor (D-05). |
| Portability | Pure JavaScript / TypeScript — no native deps. Runs on Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. |

## §5 Data Model

> Not applicable.

## §6 Interface Contracts

The `UlmError` shape is consumed by F-02, F-05, F-06, F-07 and downstream features. Its TypeScript signature is pinned in [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md) so callers can lock against it without owning the implementation. The §4.8 message templates and exit-code table also live there as the single source of truth.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit (vitest) | All 13 `UlmError` subclasses render via `.format()` | Verbatim string match against §4.8 templates (table-driven via `it.each(...)`) |
| TC-02 | Unit | ANSI emitted on TTY, suppressed otherwise | `stripAnsi(out) !== out` on forced TTY; `stripAnsi(out) === out` with `NO_COLOR=1` |
| TC-03 | Unit | UTF-8 glyph `✗` degrades to `[err]` when `LANG=C` | `expect(out).toMatchSnapshot()` |
| TC-04 | Unit | Exit-code mapping table | `error.exitCode()` returns documented integer per variant |
| TC-05 | Unit | Each default regex redacts | Parameterized over 4 patterns × ≥ 3 example lines each |
| TC-06 | Unit | `ULM_REDACT_EXTRA` adds patterns; invalid regex warns | Startup test with valid + invalid inputs |
| TC-07 | Integration | Negative corpus FPR < 1% | Runs over `tests/redact/corpus/*.txt`; assert `[REDACTED]` substitutions ≤ floor(0.01 × line_count) |
| TC-08 | Integration | Positive corpus TPR = 100% | Every line in `tests/redact/positives/*.txt` contains `[REDACTED]` after redaction |
| TC-09 | Integration | `NO_COLOR` matrix (8 combos of NO_COLOR × TTY × UTF-8) | Parameterized test asserting glyph + ANSI behavior; TTY simulated via `node-pty` for full surface |
| TC-10 | Integration | One-shot exits with documented exit code per variant | Spawn `ulm -p invalid` etc. via `node:child_process`, assert `code` callback value |
| TC-11 | Property (fast-check) | Redactor never emits unredacted credential under either default or extra patterns | `fc.assert(fc.property(...))` over generated bearer/basic strings |
| TC-12 | Snapshot (vitest) | Full output of each of the 13 codes on TTY+UTF-8 | `expect(out).toMatchSnapshot()` |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-ulm.md §6 — F-08; §4.8, §7.2
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Interface Contracts:** [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** []

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | Where does the v0 negative-test corpus come from? | security-specialist | Resolved (2026-05-23) | Seed from author-machine 60-day collection per D-01; expand on first telemetry opt-in. |
| Q-02 | On Windows legacy console, does Node's `process.stdout.isTTY` + `WT_SESSION` env reliably distinguish UTF-8 conhost from cmd.exe? | ux-specialist | Open | Empirical test against Win 10 1809, Win 11, Terminal, Powershell, cmd.exe. Blocks AC-14. Resolve by 2026-06-13. |
| Q-03 | Should redaction apply to stdout as well as stderr? | security-specialist | Open | Any provider's stdout containing tokens? Blocks D-05 scope. Resolve by F-08 implementation start. |

## §10 Implementation Notes

- F-08 ships first — every other feature (F-02, F-05, F-06, F-07) depends on the `UlmError` shape but not on its full body. Keep the public surface (pinned in INTERFACE-CONTRACTS.md) stable from week 1; the redaction module can iterate.
- The < 1% FPR / 100% TPR gates live in §4 NFR with concrete sample sizes; without sample sizes they were aspirations.
- Per PRD §10.2, telemetry never sends error messages with surrounding context — only the bare `E-<code>` value plus the pattern-list `REDACT_VERSION` int. Redaction is for stderr-to-stdout printing, not telemetry.
- D-04 pins the SGR palette (31 / 33 / 1) — 8-color works on every terminal in PRD §7.3 compat matrix without probing terminfo. Use a small inline helper rather than pulling `chalk` (one more dep on the install-footprint budget per PRD G-06).
- Implementation language: TypeScript per PRD §13 Q-06 (Node.js). Source compiled to ESM JS for the published `dist/`. Pure JS — no native deps — so install footprint stays well under the G-06 8 MB.
