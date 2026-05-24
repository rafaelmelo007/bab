# Provider Discovery — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** High
**Applies:** []
**Touches:** [src/discovery/**]
**Prototype:** N/A
**Agents:** backend-lead, security-specialist, testing-lead
**Source:** docs/prds/2026-05-23-ulm.md §6 — F-03; §5.4, §5.1.1, §4.7, §4.9.2, §7.1, §14.1
**Last updated:** 2026-05-23

---

## §1 Problem Statement

ulm needs to know which provider CLIs the user actually has installed, their versions, which transport each supports, and whether the path/binary has changed since last launch — without blocking startup or trusting a stale cache. This feature owns the PATH probe per PRD §5.4: locate `claude`, `codex`, `gemini`, `ollama` on `$PATH`; record absolute (canonicalized) paths + SHA-256 + version + capability in state.toml; re-verify on every launch to defend against PATH-poisoning. It feeds `/providers` output (§4.9.2) and the first-run welcome screen (§4.7).

## §2 Scope

### In Scope
- `which`-equivalent PATH probe for the four supported providers, run **in parallel** via `Promise.all` (D-02).
- Path canonicalization via `fs.realpath()` (Node built-in) — defeats symlink-swap (D-04).
- Per-provider `<provider> --version` capture via `child_process.execFile` with a 500 ms `AbortSignal`; best-effort regex parse `(\d+)\.(\d+)\.(\d+)`, raw string preserved on no-match (D-03).
- Capability detection: functional probe confirming the planned transport from §5.1.1 works (`claude --acp` initialize handshake; `ollama` HTTP `GET /api/tags`; exec providers verified by `--version` success). D-08.
- SHA-256 fingerprint via `node:crypto.createHash('sha256')` (D-01); informational only, not a security boundary (PRD §5.4).
- Cache results in `[providers.<name>]` blocks (DBSCHEMA owned by F-04): `absolute_path`, `version`, `transport`, `sha256`, `detected_at`.
- Re-verify on launch: missing path → re-probe; SHA mismatch → re-detect capability + one-line `⚠ binary changed since last detection` warning (once); version skew → silent re-detect.
- 500 ms per-provider probe timeout (`AbortController` + `setTimeout`); 1500 ms total wall-clock budget (§7.1); cached-launch revalidation ≤ 50 ms p95.
- `/providers` output rendering per §4.9.2 four-column layout.
- First-run welcome screen rendering per §4.7 (both 1+ detected and zero-detected variants).
- `ProviderVersion` warning emitted once per session for below-minimum versions (§14.1); F-08 dedups the print.
- Discovery telemetry events (`probe_start`, `probe_done`, `probe_timeout`, `hash_mismatch`, `version_skew`) emitted via `node:diagnostics_channel` (or `pino`); F-10 subscribes.

### Out of Scope
- The state.toml schema and its locking/atomic-write contract — owned by F-04.
- Auto-install or auto-update of provider CLIs (§8; §7.2 supply chain).
- Provider login flow — surfaced via `CliUnauth` from F-08; user runs `<provider> login`.
- OS-level binary signing / verification (PRD §5.4 — explicitly not a security boundary).
- Cross-provider session storage layout — owned by F-05.
- Background re-discovery / user-facing `/discover` command (DEF-01, DEF-03).

## §3 Acceptance Criteria

> Each AC must be independently verifiable. Mark `[x]` when test passes.

- [ ] AC-01: Clean state.toml + four providers on `$PATH` → all four probed in parallel, discovery completes ≤ 1500 ms wall-clock from process start to first prompt render.
- [ ] AC-02: Any single provider's `<provider> --version` exceeding 500 ms → probe aborted via `AbortController.abort()`, provider recorded with `version = ""`, `transport = ""`, surfaced in `/providers` as `✗ —`; discovery continues without crashing.
- [ ] AC-03: Successful probe → `[providers.<name>]` written with exactly: `absolute_path` (canonicalized via `fs.realpath`), `version` (raw string), `transport` (`"acp"` | `"exec"` | `"http"`), `sha256` (lowercase 64-char hex), `detected_at` (RFC3339 UTC).
- [ ] AC-04: Cached `[providers.<name>]` with matching path + SHA + `--version` → no re-detection runs; discovery exits in ≤ 50 ms p95.
- [ ] AC-05: Cached `absolute_path` no longer exists → PATH re-probed; new canonical path persisted; capability detection re-runs.
- [ ] AC-06: SHA-256 mismatch at unchanged path → capability detection re-runs; new hash + version persisted; `⚠ provider 'X' binary changed since last detection` printed exactly once (not per turn).
- [ ] AC-07: Version skew at unchanged path → capability detection re-runs silently; transport updated if changed; no warning printed.
- [ ] AC-08: Capability detection per §5.1.1 matrix: `claude` attempts ACP (`initialize` JSON-RPC with 300 ms sub-budget); falls back to `exec` on failure or PRE-02 negative. `codex`, `gemini` → `exec`. `ollama` → `http` only after `fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(300) })` returns 200.
- [ ] AC-09: `ollama --version` below 0.1.20 (§14.1) → `⚠` mark, `ProviderVersion` thrown once per session, does not block use.
- [ ] AC-10: `/providers` output matches §4.9.2 four-column layout byte-for-byte; em-dash `—` for missing fields; glyph downgrades to `[ok]`/`[!]`/`[err]` and em-dash to `-` under NO_COLOR or non-UTF-8 locale.
- [ ] AC-11: First run with 1–3 providers detected → §4.7 welcome screen wording, capitalization, two-space gaps verified by golden-file unit test (vitest snapshot).
- [ ] AC-12: Zero providers detected on `$PATH` → zero-provider §4.7 welcome variant rendered with the four install URLs; ulm returns to REPL prompt (does not exit).
- [ ] AC-13: Symlink at probed path (`~/.local/bin/claude → /usr/local/bin/claude`) → `absolute_path` records `/usr/local/bin/claude` (canonical target via `fs.realpath`), not the symlink.

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | First-run discovery ≤ 1500 ms total wall-clock; per-provider probe ≤ 500 ms hard limit (kill via `AbortController.abort()`); cached-launch revalidation ≤ 50 ms p95. |
| Concurrency | All four probes run via `Promise.all` on the event loop; serial probing (4 × 500 ms = 2000 ms) would exceed the total budget. |
| Error budget | Probe timeout, missing binary, parse failure, hash mismatch — none crash ulm; each downgrades to `✗ —` or `⚠` and is reported in `/providers`. |
| Browser support | N/A |
| Quota enforcement | N/A |
| Accessibility | `/providers` glyphs (`✓ ⚠ ✗`) carry adjacent text via the status column; downgrade to `[ok] [!] [err]` per §4.7 when `LANG`/`LC_ALL` lacks UTF-8 or `NO_COLOR=1`; em-dash downgrades to `-`. |
| Security | Absolute-path pinning via `fs.realpath()` (resolves symlinks at detection — D-04); SHA-256 informational only (PRD §5.4 — not a security boundary); `ProviderVersion` never blocks. |
| Idempotency | Re-running discovery on identical inputs produces byte-identical state.toml output (modulo `detected_at`); prevents spurious mtime churn. |
| Observability | Discovery emits structured events per provider (`probe_start`, `probe_done`, `probe_timeout`, `hash_mismatch`, `version_skew`) via `node:diagnostics_channel`; F-10 subscribes. |
| Portability | Pure JS — `node:fs`, `node:child_process`, `node:crypto`, `fetch`. No native deps. Runs on Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. |

## §5 Data Model

> Consumes the state.toml schema owned by F-04. The `[providers.<name>]` block is defined in [`state-store/DBSCHEMA.md`](../state-store/DBSCHEMA.md) §2.

## §6 Interface Contracts

> Not applicable — `Applies` does not include `interface-contracts`. `<provider> --version` parsing is governed by each provider's CLI, not by ulm.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit (vitest) | Version-string parser on real Claude/Codex/Gemini/Ollama sample outputs | Extracts semver triple; unknown shape stores raw string with `parsed: null` |
| TC-02 | Unit | `compareMinVersion` for ollama 0.1.19 / 0.1.20 / 0.2.0-rc1 | `"BelowMinimum"`, `"OK"`, `"OK"` (rc/pre suffixes ignored) |
| TC-03 | Unit | SHA-256 via `node:crypto` of 1 MB fixture | Matches precomputed digest; lowercase 64-char hex |
| TC-04 | Unit | `/providers` golden render — 4 ready, 4 mixed, 0 providers | Byte-for-byte match with `tests/golden/providers_*.txt` under NO_COLOR and color |
| TC-05 | Unit | First-run welcome golden (3-detected + zero-detected) | Byte-for-byte match with §4.7 wording |
| TC-06 | Integration | Mock PATH with 4 fake binaries (shell scripts on Unix, `.cmd` files on Windows); cold discovery | All 4 detected; state.toml written; total ≤ 1500 ms on `ubuntu-latest` |
| TC-07 | Integration | Mock binary sleeps 600 ms on `--version` | Probe aborted at 500 ms; provider recorded as `✗ —`; ulm continues |
| TC-08 | Integration | Parallel probe budget — 4 binaries each sleep 400 ms | Total ≤ 700 ms (proves `Promise.all` parallelism) |
| TC-09 | Integration | Cached path no longer exists | Re-probe runs; new path persisted; capability detection re-ran |
| TC-10 | Integration | Stale SHA-256 (file modified between launches) | Warning emitted exactly once; re-detection runs; new hash persisted |
| TC-11 | Integration | Version skew (cached 1.2.0 vs current 1.3.0) | Capability detection re-runs silently; no warning printed |
| TC-12 | Integration | Symlink at `/tmp/claude → /usr/local/bin/claude` | `absolute_path` = `/usr/local/bin/claude` |
| TC-13 | Integration | Ollama daemon down — binary exists but 11434 unreachable | Transport `http`, status `⚠`, surfaced in `/providers`; ulm launches |
| TC-14 | Integration | Below-minimum ollama (0.1.19) | `ProviderVersion` thrown once at first surface; not repeated within session |
| TC-15 | E2E (node-pty) | Full ulm launch on fixture PATH; first prompt sent | Discovery completes; `/providers` matches expected; prompt routes correctly |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-ulm.md §6 — F-03; §5.4, §5.1.1, §4.7, §4.9.2, §7.1, §14.1
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** [state-store]

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | SHA-256 implementation | backend-lead | Resolved (2026-05-23) | `node:crypto.createHash('sha256')` — built-in, zero install footprint (D-01) |
| Q-02 | Should Ollama HTTP probe be skipped when `ollama` binary is absent? | backend-lead | Open | Default: probe HTTP only when binary is present; document docker-only edge case in README. Resolve by F-03 implementation start. |
| Q-03 | How does discovery interact with F-04 per-key merge for concurrent `[providers.*]` and `[sessions]` writes? | backend-lead | Open | Cross-link to F-04 critique; both writers must use the per-key API. Resolve in F-04 implementation. |

## §10 Implementation Notes

- The SHA-256 record is informational, not a security boundary (PRD §5.4). Hash mismatch triggers re-detection + warning, not refuse-to-run.
- Parallelizing the four probes via `Promise.all` is non-optional under the 1500 ms budget — serial worst-case (4 × 500 ms) exceeds it.
- Version-string parsing must be best-effort: provider `--version` formats drift over time, and ulm must not crash on format change. Raw string is preserved for forensics; semver triple is computed lazily for comparison.
- D-08 capability detection for ACP requires a functional probe (`initialize` handshake), not just `--version` parsing — a binary that announces ACP support may still fail to negotiate.
- Below-minimum versions emit `ProviderVersion` once per session via F-08's dedup `Set<string>` (D-07 in F-08 critique).
- Pure-JS implementation: `node:fs.realpath`, `node:child_process.execFile`, `node:crypto.createHash`, `fetch` (Node 18+ built-in). Zero native deps, zero install-footprint cost.
