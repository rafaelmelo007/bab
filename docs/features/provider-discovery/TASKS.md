# Tasks — Provider Discovery

**Feature:** provider-discovery
**Source:** SPEC.md (13 ACs), DECISIONS.md (D-01..D-08)
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Scaffold `src/discovery/index.ts` exporting `discoverAll()` returning `Promise<DiscoveryResult[]>` | backend-lead | High | Done | AC-01 | — |
| T-02 | Implement PATH probe via `which`-equivalent (`process.env.PATH.split(path.delimiter)` + `fs.access`) for the 4 supported providers | backend-lead | High | Done | AC-01, AC-05 | — |
| T-03 | Wire `Promise.all` over 4 parallel probes (D-02) — serial would exceed the 1500 ms total budget | backend-lead | High | Done | AC-01, AC-08 | D-02 |
| T-04 | Implement per-probe `AbortController` + `setTimeout(500)` cancellation for `execFile('<provider>', ['--version'], { signal })` | backend-lead | High | Done | AC-02 | D-02 |
| T-05 | Implement version-string parser: regex `/(\d+)\.(\d+)\.(\d+)/`, raw-string fallback on no-match | backend-lead | High | Done | AC-03 | D-03 |
| T-06 | Implement `fs.realpath()` canonicalization at detection time (defeats symlink swap) | security-specialist | High | Done | AC-13 | D-04 |
| T-07 | Implement SHA-256 via `node:crypto.createHash('sha256')` on the canonical binary; emit lowercase 64-char hex | security-specialist | High | Done | AC-03 | D-01 |
| T-08 | Implement `compareMinVersion(found, minimum)` returning `"BelowMinimum"`/`"OK"`; ignore `-rc`/`-pre` suffixes | backend-lead | Medium | Done | AC-09 (TC-02) | — |
| T-09 | Implement capability detection for `claude` via `child_process.spawn('claude', ['--acp'])`, send JSON-RPC `initialize`, 300 ms sub-budget; fall back to `exec` on failure | backend-lead | High | Done | AC-08 | D-08 |
| T-10 | Implement capability detection for `codex` and `gemini` → fixed `transport: "exec"` (per §5.1.1 matrix) | backend-lead | High | Done | AC-08 | — |
| T-11 | Implement Ollama HTTP probe via `fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(300) })`; treat connection refused as `transport: "http"` + status `⚠` (daemon-down) | backend-lead | High | Done | AC-08, AC-13 | D-06 |
| T-12 | Implement state.toml `[providers.<name>]` write via F-04 per-key save: `absolute_path`, `version`, `transport`, `sha256`, `detected_at` | backend-lead | High | Done | AC-03 | — |
| T-13 | Implement cached-launch revalidation fast path: if cached path exists + SHA matches + `--version` matches, skip re-detection (target ≤ 50 ms p95) | backend-lead | High | Done | AC-04 | D-05 |
| T-14 | Implement missing-path re-probe: cached `absolute_path` no longer exists → fall back to PATH probe + new canonical path | backend-lead | High | Done | AC-05 | — |
| T-15 | Implement SHA-mismatch warning: at unchanged path, hash differs → re-detect capability + persist new hash + print `⚠ provider 'X' binary changed since last detection` exactly once (via Set in `src/discovery/warnings.ts`) | security-specialist | High | Done | AC-06 | D-05 |
| T-16 | Implement version-skew silent re-detect: cached version differs from current `--version` → re-run capability detection silently | backend-lead | Medium | Done | AC-07 | — |
| T-17 | Implement `/providers` output renderer (4-column layout per PRD §4.9.2): name 8-left, glyph 1, version 8, transport free-form; em-dash for missing | ux-specialist | High | Done | AC-10 | — |
| T-18 | Implement glyph fallback (`✓`/`⚠`/`✗` → `[ok]`/`[!]`/`[err]`; `—` → `-`) under NO_COLOR / non-UTF-8 (consume F-08 helpers) | ux-specialist | High | Done | AC-10 | — |
| T-19 | Implement first-run welcome screen (PRD §4.7): 1–3-providers variant + zero-providers variant with 4 install URLs | ux-specialist | High | Done | AC-11, AC-12 | D-09 (F-01 cross-ref) |
| T-20 | Implement below-minimum version warning: throw F-08 `ProviderVersion` once per session via process-local `Set<string>` dedup | security-specialist | High | Done | AC-09 | D-07 |
| T-21 | Wire discovery telemetry spans via `node:diagnostics_channel`: `probe_start`, `probe_done`, `probe_timeout`, `hash_mismatch`, `version_skew` | devops-lead | Low | Done | — (NFR Observability) | — |
| T-22 | Write vitest unit test for version-string parser against sample outputs from claude/codex/gemini/ollama | testing-lead | Medium | Done | TC-01 | — |
| T-23 | Write vitest unit test for `compareMinVersion` (ollama 0.1.19 / 0.1.20 / 0.2.0-rc1) | testing-lead | Medium | Done | TC-02 | — |
| T-24 | Write vitest unit test for SHA-256 of 1 MB fixture against precomputed digest | testing-lead | Low | Done | TC-03 | — |
| T-25 | Write `/providers` golden-file tests (4-ready / 4-mixed / 0-providers, with + without NO_COLOR) | testing-lead | High | Done | TC-04 | — |
| T-26 | Write first-run welcome golden-file tests (3-detected + zero-detected variants) | testing-lead | High | Done | TC-05 | — |
| T-27 | Build mock-PATH integration harness with 4 fake binaries (Unix shell scripts, Windows `.cmd` files); assert all 4 detected in ≤ 1500 ms on ubuntu-latest | testing-lead | High | Done | TC-06 | — |
| T-28 | Write integration test asserting 500 ms probe timeout: mock binary sleeps 600 ms → probe aborted, provider recorded as `✗ —`, bab continues | testing-lead | High | Done | TC-07 | — |
| T-29 | Write integration test proving parallelism (4 × 400 ms binaries finish in ≤ 700 ms total) | testing-lead | High | Done | TC-08 | D-02 |
| T-30 | Write integration tests for cached-path-missing (TC-09), SHA-mismatch (TC-10), version-skew (TC-11), symlink (TC-12) | testing-lead | Medium | Done | TC-09..TC-12 | — |
| T-31 | Write integration test for Ollama daemon-down: binary exists, port unreachable → `⚠`, surfaced in `/providers` | testing-lead | Medium | Done | TC-13 | — |
| T-32 | Write integration test for below-minimum ollama (0.1.19): `ProviderVersion` thrown once per session | testing-lead | Medium | Done | TC-14 | D-07 |
| T-33 | Write node-pty E2E test for full bab launch on fixture PATH, send first prompt, verify routing | testing-lead | Low | Done | TC-15 | — |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
