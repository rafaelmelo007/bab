# Tasks — Provider Transport

**Feature:** provider-transport
**Source:** SPEC.md (18 ACs), DECISIONS.md (D-01..D-11)
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Scaffold `src/transport/index.ts` defining `ProviderTransport` interface: `send(prompt, sessionId?, opts?): AsyncIterable<TokenEvent>` + `cancel(): Promise<void>` | backend-lead | High | Done | AC-01 | — |
| T-02 | Define `TokenEvent` discriminated union: `{ kind: 'content', text } \| { kind: 'stderr', text } \| { kind: 'meta', frame }` | backend-lead | High | Done | AC-01 | D-01 |
| T-03 | Scaffold `src/spawn/index.ts` shared helper exporting `spawnProvider(absolutePath, args, opts)` — single source of truth for env denylist + argv-only enforcement | security-specialist | High | Done | AC-02, AC-03 | D-02 |
| T-04 | Implement env denylist in `src/spawn/index.ts`: strip `*_API_KEY`, `*_TOKEN`, `*_SECRET`, `*_PASSWORD`, `AWS_*` (except `AWS_REGION`), `GOOGLE_APPLICATION_CREDENTIALS` before `child_process.spawn` | security-specialist | High | Done | AC-03 | D-02 |
| T-05 | Implement `ULM_PROPAGATE_ENV` allowlist override; single log line per session on activation; `ULM_PROPAGATE_ENV=*` per-turn warning | security-specialist | High | Done | AC-04 | — |
| T-06 | Add CI grep rule blocking `spawn("sh"\|"bash"\|"cmd"\|"powershell"\|"pwsh", ...)` and `shell: true` in `src/transport/`, `src/spawn/`, `src/oneshot/` | security-specialist | High | Done | AC-02 | D-07 |
| T-07 | Scaffold `src/transport/exec.ts` implementing `ExecTransport` per the interface; spawn via `ulm-spawn` helper; stdout via `readline.createInterface` (line-by-line UTF-8) | backend-lead | High | Done | AC-01, AC-02 | — |
| T-08 | Implement exec timeout: `AbortController` + `setTimeout(ULM_TURN_TIMEOUT*1000)`; default 60s; signal + SIGTERM + SIGKILL escalation per §4.7 | backend-lead | High | Done | AC-05 | — |
| T-09 | Implement mid-stream crash handling: child exits non-zero → AsyncIterable throws `TransportCrashed { exitCode, partial: true }`; partial stdout already streamed | backend-lead | High | Done | AC-09 | — |
| T-10 | Wire F-08 redactor: `redact.scrub(line)` on every stderr line before yielding `TokenEvent { kind: 'stderr', text }` | security-specialist | High | Done | AC-15 | D-09 |
| T-11 | Scaffold `src/transport/acp/index.ts` implementing `AcpTransport` (persistent subprocess, JSON-RPC over stdio) | backend-lead | High | Done | AC-01 | — |
| T-12 | Scaffold `src/transport/acp/frame.ts` (~150 LOC) — length-prefixed JSON-RPC reader/writer; tested against `tests/fixtures/acp-corpus/` | backend-lead | High | Done | — | D-08 |
| T-13 | Implement ACP `initialize` handshake on transport open | backend-lead | High | Done | (TC-07) | — |
| T-14 | Implement ACP keepalive: `setInterval(10_000)` emits `ping` JSON-RPC when idle; cancel during in-flight turn | backend-lead | High | Done | AC-07 | — |
| T-15 | Implement ACP 30s no-byte idle kill: kills subprocess when no bytes (including pings) received for 30s; long-think with ping replies survives | backend-lead | High | Done | AC-06 | — |
| T-16 | Scaffold `src/transport/http.ts` implementing `OllamaTransport` via `fetch('http://127.0.0.1:11434/api/chat', { signal: AbortSignal.timeout(30_000) })`; stream NDJSON chunks as `TokenEvent` | backend-lead | High | Done | AC-10 | — |
| T-17 | Handle Ollama 30s timeout → throw F-08 `HttpTimeout`; connection refused → F-08 `CliMissing`-equivalent | backend-lead | High | Done | AC-10 | — |
| T-18 | Implement Ctrl-C cancellation: shared `AbortController` per transport; `cancel()` calls `abort()`; stdio reads observe `signal.aborted`; `send()` AsyncIterable throws `TransportCancelled` | backend-lead | High | Done | AC-08 | D-04 |
| T-19 | Add `tree-kill` (^1) dep to package.json for cross-platform process-tree signaling on Windows | backend-lead | High | Done | AC-08 | D-11 |
| T-20 | Implement SIGINT → 500 ms → SIGTERM → 500 ms → SIGKILL escalation (≤ 1.6 s total) via `tree-kill` on Windows, `process.kill` on Unix | backend-lead | High | Done | AC-08 | D-11 |
| T-21 | Scaffold `src/pid/index.ts` exporting `processStartTime(pid): Promise<number>`; per-OS impl: Linux `/proc/<pid>/stat` field 22; macOS `ps -p <pid> -o lstart=`; Windows `wmic process where (ProcessId=<pid>) get CreationDate` | backend-lead | High | Done | AC-11 | D-06 |
| T-22 | Implement PID-marker file in `$ULM_CACHE_DIR/pids/<provider>.pid` containing `<pid>\t<start_time>`; on startup reap only if start-time matches | backend-lead | High | Done | AC-11, AC-12 | D-06 |
| T-23 | Implement REPL-exit cleanup: kill all warm ACP children, remove PID-marker files within 1s | backend-lead | High | Done | AC-12 | — |
| T-24 | Implement transport factory reading capability matrix from F-04 state.toml (`[providers.<name>].transport`); never re-detect mid-session | backend-lead | High | Done | AC-13 | — |
| T-25 | Implement concurrent-send guard: one in-flight `send()` per transport instance; second call throws `TransportBusy` | backend-lead | Medium | Done | AC-16 | D-10 |
| T-26 | Scaffold `src/transport/daemon.ts` stub `DaemonSocketTransport` that delegates to `ExecTransport`; proves PRD §9.4 forward-compat | backend-lead | Medium | Done | AC-17 | — |
| T-27 | Build `tests/fixtures/noop-provider.mjs` (50 LOC) — fixed-length reply, deterministic timing; runs under `node` directly | testing-lead | High | Done | (TC-04, TC-17) | D-05 |
| T-28 | Build `tests/fixtures/noop-acp-peer.mjs` (50 LOC) — accepts handshake, configurable silence / reply-to-ping behavior | testing-lead | High | Done | (TC-07, TC-08, TC-09, TC-10, TC-18) | D-05 |
| T-29 | Build `tests/fixtures/acp-corpus/` with captured ACP frames for `acp-frame.ts` parser tests | testing-lead | High | Done | TC-07 | D-08 |
| T-30 | Write vitest TS-compile test asserting `dyn ProviderTransport` interface object-safety: `const t: ProviderTransport = new ExecTransport(...)` typechecks | testing-lead | Medium | Done | TC-01 | — |
| T-31 | Write unit test for env denylist matcher (5 denylisted + 3 allowed cases; case-insensitive on Windows) | testing-lead | High | Done | TC-02, TC-14 | — |
| T-32 | Write unit test asserting `ExecTransport.buildSpawnArgs()` returns argv-only form with `shell: false` and filtered env | testing-lead | High | Done | TC-03 | — |
| T-33 | Write node-pty integration tests: exec happy path (TC-04), exec crash (TC-05), exec timeout (TC-06) | testing-lead | High | Done | TC-04, TC-05, TC-06 | — |
| T-34 | Write mock-peer integration tests: ACP handshake (TC-07), keepalive count (TC-08), silent kill (TC-09), long think with pings (TC-10) | testing-lead | High | Done | TC-07..TC-10 | — |
| T-35 | Write `nock` integration tests for Ollama happy path (TC-11) + refused (TC-12) | testing-lead | High | Done | TC-11, TC-12 | — |
| T-36 | Write integration test for Ctrl-C escalation timing (SIGINT/SIGTERM/SIGKILL at 0/500/1000 ms ± 50 ms) | testing-lead | High | Done | TC-13 | — |
| T-37 | Write integration test for PID-reuse defense: fake stale PID-marker for current shell PID with old start-time; ulm does NOT kill current shell | testing-lead | High | Done | TC-15 | D-06 |
| T-38 | Write integration test for concurrent send: second `send()` throws `TransportBusy` | testing-lead | Medium | Done | TC-16 | D-10 |
| T-39 | Wire `tinybench` deps + author `tests/bench/transport_overhead.ts` (≥ 1000 samples, p50/p95/p99 + CI bands) | perf-specialist | High | Done | AC-14, TC-17, TC-18 | D-05 |
| T-40 | Write integration test asserting stub `DaemonSocketTransport` compiles and all ACs pass when factory swaps to it | testing-lead | Medium | Done | TC-19, AC-17 | — |
| T-41 | Write Windows argv test: prompts with `"`, `\`, `&` round-trip safely via `spawn(cmd, [args], { shell: false })` | security-specialist | High | Done | AC-18 | D-07 |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
