# Tasks — Telemetry Opt-In

**Feature:** telemetry-opt-in
**Source:** SPEC.md (16 ACs), DECISIONS.md (D-01..D-09), INTERFACE-CONTRACTS.md
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Scaffold `src/telemetry/index.ts` exporting `emit(name, data)`, `enable()`, `disable()`, `local()` operations | backend-lead | High | Done | AC-01..AC-05 | — |
| T-02 | Scaffold `src/telemetry/endpoint.ts` with build-time-constant `TELEMETRY_URL: \`https://${string}\`` per D-04 (TS narrow type prevents `http://`) | security-specialist | High | Done | AC-12 | D-04 |
| T-03 | Implement anon-ID generation via `node:crypto.randomBytes(16).toString('hex')`; 32-char lowercase hex | backend-lead | High | Done | AC-01 | D-01 |
| T-04 | Implement `bab telemetry enable` subcommand (commander) that reads `tests/telemetry/enable_output.txt` fixture, prints verbatim, prompts `yes/no` | backend-lead | High | Done | AC-02, AC-03 | — |
| T-05 | Author `tests/telemetry/enable_output.txt` containing verbatim disclosure per INTERFACE-CONTRACTS.md §9 | prompt-engineer | High | Done | AC-02 | — |
| T-06 | Implement `bab telemetry enable` confirmation logic: only `yes` (case-insensitive) persists; any other input cancels with exit non-zero | backend-lead | High | Done | AC-03 | — |
| T-07 | Implement state.toml `[telemetry]` block writes via F-04 per-key API (`enabled`, `anon_id`, `mode`) | backend-lead | High | Done | AC-01, AC-04, AC-05 | D-08 |
| T-08 | Implement `bab telemetry disable`: zero anon_id with `Buffer.alloc(16).fill(0)` (D-07), set `enabled = false`, `mode = "off"`, delete JSONL cache file | security-specialist | High | Done | AC-04, AC-16 | D-07 |
| T-09 | Implement `bab telemetry local`: set `mode = "local"`; emit appends to `$BAB_CACHE_DIR/telemetry.jsonl` only; HTTP sender NOT started | backend-lead | High | Done | AC-05 | D-08 |
| T-10 | Implement disabled / `mode = "off"` short-circuit: no sockets opened from telemetry module; verified via spy on `net.Socket.connect` | security-specialist | High | Done | AC-06 | — |
| T-11 | Implement `BAB_NO_TELEMETRY` kill switch: any non-empty value other than `0`/`false` short-circuits BEFORE allowlist check | security-specialist | High | Done | AC-07 | — |
| T-12 | Implement event-name allowlist guard: only the 6 allowed names succeed; unknown throws in dev / drops+logs in prod | backend-lead | High | Done | AC-08 | — |
| T-13 | Implement per-event field allowlist (per INTERFACE-CONTRACTS §4 table); unknown keys stripped + WARN logged once, event continues with allowed subset (D-06) | backend-lead | High | Done | AC-09 | D-06 |
| T-14 | Author negative-test corpus in `tests/telemetry/forbidden_corpus/`: inject prompt content, session-ID UUIDs, file paths (`/home/...`, `C:\...`), env-var-shaped strings into every emit-site input | security-specialist | High | Done | AC-10 | — |
| T-15 | Implement async emit via in-process queue: `emit()` pushes to `Array<Event>`, returns ≤ 1 ms p95; REPL turn never awaits | backend-lead | High | Done | AC-11 | — |
| T-16 | Implement HTTPS-only HTTP transport via built-in `fetch` (TLS 1.2+ via Node default cert-chain validation) | security-specialist | High | Done | AC-12 | — |
| T-17 | Implement per-event retry: 3 attempts at 250 ms / 1 s / 4 s backoff per D-02; after 3rd failure → park in JSONL cache | backend-lead | High | Done | AC-13 | D-02 |
| T-18 | Implement drain loop: HEAD probe to endpoint every 5 min when cache non-empty; on reachable, FIFO drain | backend-lead | High | Done | AC-14 | — |
| T-19 | Implement local-cache JSONL append at `$BAB_CACHE_DIR/telemetry.jsonl` with mode 0600 + 5 MB FIFO trim per D-03 | backend-lead | High | Done | AC-15 | D-03 |
| T-20 | Implement OS string mapping (per D-05): `process.platform` → `"linux"`/`"macos"`/`"windows"`; unsupported (`freebsd`, etc.) → `"linux"` + worklog entry | devops-lead | Medium | Done | (INTERFACE-CONTRACTS §3 `os`) | D-05 |
| T-21 | Implement §4.8 error-code → event_name conversion: hyphens → underscores per D-09 (`error_CLI_MISSING` etc.) | backend-lead | Medium | Done | (INTERFACE-CONTRACTS §5) | D-09 |
| T-22 | Wire `REDACT_VERSION` constant from F-08 into `error_<CODE>` event_data per INTERFACE-CONTRACTS §4 | backend-lead | Low | Done | (INTERFACE-CONTRACTS §4) | — |
| T-23 | Implement crash event handling per Q-02 (synchronous-write-to-JSONL, no network attempt; drained on next launch) | backend-lead | Medium | Done | TC-16 | — |
| T-24 | Write vitest unit test for anon-ID: 128 bits via `randomBytes`, 32-char lowercase hex, uniqueness across 10k generations | testing-lead | High | Done | TC-01 | — |
| T-25 | Write vitest unit test for event-name allowlist (TC-02) + per-event field allowlist (TC-03) | testing-lead | High | Done | TC-02, TC-03 | — |
| T-26 | Write vitest test asserting forbidden-fields corpus produces zero leakage in serialized output | testing-lead | High | Done | TC-04, AC-10 | — |
| T-27 | Write vitest line-ending-normalized snapshot test for `bab telemetry enable` verbatim string | testing-lead | High | Done | TC-05 | — |
| T-28 | Write vitest test for `BAB_NO_TELEMETRY=1` kill switch: no JSONL write, no socket open | testing-lead | High | Done | TC-06 | — |
| T-29 | Write integration test for opt-in flow: `bab telemetry enable` + `yes` → state.toml mutated via F-04 contract; mode = "remote"; anon_id set | testing-lead | High | Done | TC-07 | — |
| T-30 | Write integration test for disable purges cache: pre-seed 100 events → disable → file absent; subsequent enable generates new anon_id | testing-lead | High | Done | TC-08 | D-07 |
| T-31 | Write nock integration test for local mode never transmits: `mode = "local"`, emit 10, assert 0 HTTP requests + 10 JSONL lines | testing-lead | High | Done | TC-09 | — |
| T-32 | Write integration test for async non-blocking emit: hung mock endpoint; 100 emits return p95 ≤ 1 ms each | testing-lead | High | Done | TC-10 | — |
| T-33 | Write integration test with `vi.useFakeTimers` for 24h cache+retry+drain SLO: endpoint 503 for 24h, then 204; ≥ 95% drained in next 24h | testing-lead | High | Done | TC-11, AC-14 | — |
| T-34 | Write TypeScript compile-time test asserting `http://` URL is rejected by the `TELEMETRY_URL` narrow type | testing-lead | Medium | Done | TC-12 | D-04 |
| T-35 | Write integration test asserting TLS 1.0 endpoint rejected by `fetch`; TLS 1.2 accepted | testing-lead | Medium | Done | TC-13 | — |
| T-36 | Write integration test for file permissions: JSONL mode 0600 (Unix); user-only DACL (Windows via F-04 parent-dir inherit) | testing-lead | Medium | Done | TC-14 | — |
| T-37 | Write node-pty E2E test for fresh-state-toml first launch: telemetry off, no network activity for 5 min idle | testing-lead | Medium | Done | TC-15 | — |
| T-38 | Write integration test for crash event: simulated throw → sync JSONL write, no network attempt; drained on next successful POST | testing-lead | Medium | Done | TC-16 | — |
| T-39 | Wire tinybench gate `tests/bench/telemetry_emit.ts`: p95 ≤ 1 ms emit; regression budget 10% | perf-specialist | Medium | Done | TC-17, AC-11 | — |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.

> **DEF-01 (endpoint hosting) + DEF-02 (crash transport)** are gated on PRD Q-08 / Q-09 resolution. Until then, T-04..T-19 can target a local Verdaccio + self-signed HTTPS stub.
