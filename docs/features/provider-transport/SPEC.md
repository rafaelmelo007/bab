# Provider Transport — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** High
**Applies:** []
**Touches:** [src/transport/**, src/spawn/**, src/pid/**]
**Prototype:** N/A
**Agents:** backend-lead, perf-specialist, security-specialist, testing-lead
**Source:** docs/prds/2026-05-23-ulm.md §6 — F-02; §5.1, §5.1.1, §5.1.2, §4.7, §4.8, §7.1, §7.2, §9.4
**Last updated:** 2026-05-23

---

## §1 Problem Statement

ulm must drive four provider CLIs (claude, codex, gemini, ollama) over three different transports (ACP, exec, HTTP) without bleeding transport-specific code into the REPL, session, or one-shot layers. This feature delivers the `ProviderTransport` seam — a single abstraction every higher-level feature uses to send a prompt and stream a response — plus the subprocess-lifecycle contract (spawn, stdio framing, timeout, cancellation, partial-stream handling) and the PATH-poisoning + env-leak defense from PRD §5.1 / §7.2. Keeping this seam clean is what preserves the §9 daemon-mode escape hatch without building it now.

## §2 Scope

### In Scope
- `ProviderTransport` TypeScript interface: `send(prompt, sessionId, opts) → AsyncIterable<TokenEvent>` + `cancel()`; zero deps on REPL / slash / session code.
- Three transport implementations with per-provider selection per §5.1.1:
  - **exec** — argv-array `child_process.spawn(absolutePath, args, opts)` (D-02 shared `ulm-spawn` helper); pipes for stdio
  - **ACP** — length-prefixed JSON-RPC over stdio with 10 s keepalive ping (in-tree `src/transport/acp/frame.ts`, D-08)
  - **HTTP** — Ollama only, `fetch('http://localhost:11434/api/chat', { method: 'POST', body: …, signal })` with NDJSON streaming response
- `TokenEvent` discriminated union: `{ kind: 'content', text }` | `{ kind: 'stderr', text }` | `{ kind: 'meta', frame }` (D-01).
- Subprocess lifecycle (§5.1.2): argv-only spawn via shared `src/spawn/index.ts` helper (D-02 — single source of truth); stdout streamed via `readline.createInterface` over child's stdout (UTF-8 line-by-line); stderr buffered, redacted via F-08 on every line (D-09); 60 s exec timeout (`ULM_TURN_TIMEOUT` override) via `AbortController` + `setTimeout`; 30 s no-byte ACP idle kill; pipes (not PTY) for stdio (D-03).
- Cancellation: Ctrl-C → SIGINT (or `tree-kill` on Windows for `CTRL_BREAK_EVENT` semantics) → 500 ms grace → SIGTERM → 500 ms grace → SIGKILL; total ≤ 1.6 s; second Ctrl-C within 1 s exits ulm. `AbortController.abort()` signal observed at every stdio read (D-04).
- ACP keepalive: `ping` JSON-RPC every 10 s when idle (via `setInterval`); 30 s no-byte rule does not fire if pings reply.
- Cleanup on REPL exit: kill warm ACP children; PID-marker file with start-time match via `src/pid/index.ts` shim (D-06) to defeat PID reuse — uses native syscalls per OS (Linux `/proc/<pid>/stat`, macOS `proc_pidinfo` via `node-ffi-napi` or shell out to `ps -o lstart=`, Windows `GetProcessTimes` via `ffi-napi`).
- Env denylist applied **before** spawn via shared helper (D-02): `*_API_KEY`, `*_TOKEN`, `*_SECRET`, `*_PASSWORD`, `AWS_*` except `AWS_REGION`, `GOOGLE_APPLICATION_CREDENTIALS`. `ULM_PROPAGATE_ENV` allowlist override.
- Windows argv quoting: Node's `child_process.spawn(cmd, args)` uses argv-array form which avoids shell escaping; `shell: false` (default) is mandatory (D-07).
- ACP framing: in-tree `src/transport/acp/frame.ts` (~150 lines TypeScript), tested against captured frames in `tests/fixtures/acp-corpus/` (D-08).
- One in-flight `send()` per transport instance; second throws `TransportBusy` (D-10).
- Forward-compat seam: a stub `DaemonSocketTransport` that delegates to `ExecTransport` must compile and pass tests — proves PRD §9.4 holds (AC-17 / TC-19).

### Out of Scope
- Daemon-mode socket transport — v2 (DEF-02); v1 only needs the trait seam.
- Provider discovery, version detection, login state — owned by F-03.
- Session ID assignment / `--resume <id>` semantics — owned by F-05.
- Auto-install of provider CLIs (§8 constraint).
- vt100 PTY screen-scraping fallback (Q-02 PRD §13 — deferred unless a provider lacks both ACP and clean `-p`); see DEF-01.
- Multi-subprocess-per-provider / parallel turns (§7.1 spawn cap; DEF-04).
- Connection pooling for Ollama HTTP (DEF-05).

## §3 Acceptance Criteria

- [ ] AC-01: `ProviderTransport` interface compiles in isolation; the `src/transport/` module has zero imports from `src/repl/`, `src/sessions/`, `src/commands/`.
- [ ] AC-02: Argv-only exec spawn — CI grep `grep -rnE 'spawn\(["\x27](sh|bash|cmd|powershell|pwsh)["\x27]' src/transport/` returns 0 hits; CI also asserts `shell: false` (or no `shell` option set) on every `spawn` call in `src/transport/` and `src/spawn/`.
- [ ] AC-03: Env denylist applied before spawn — set `OPENAI_API_KEY=leak`, `AWS_SECRET_ACCESS_KEY=leak`, `GITHUB_TOKEN=leak`, `MY_PASSWORD=leak`, `AWS_REGION=us-east-1`, `GOOGLE_APPLICATION_CREDENTIALS=/path`. Spawn a child that prints `process.env` as JSON. Assert: denylisted keys absent; `AWS_REGION` present; `GOOGLE_APPLICATION_CREDENTIALS` absent. Case-insensitive on Windows.
- [ ] AC-04: `ULM_PROPAGATE_ENV="MY_TOKEN,FOO"` allowlists; `MY_TOKEN` and `FOO` reach child; `BAR_TOKEN` doesn't. One log line per session naming propagated vars. `ULM_PROPAGATE_ENV=*` emits a per-turn warning.
- [ ] AC-05: Exec timeout fires at 60 s; `ULM_TURN_TIMEOUT=5` reduces to 5 s. Subprocess receives SIGTERM then SIGKILL per §4.7; child reaped (no zombie — verified by checking `child.exitCode !== null` after `await` resolves).
- [ ] AC-06: ACP no-byte idle kill at 30 ± 1 s when peer goes silent including pings. Peer replying to pings only → no kill at 60 s (legitimate long think).
- [ ] AC-07: ACP keepalive — idle ACP connection emits `ping` every 10 ± 0.5 s; counter ≥ 5 pings in 60 s. No extraneous pings during in-flight turn.
- [ ] AC-08: Ctrl-C cancellation completes ≤ 1.6 s. SIGINT forwarded to subprocess within 50 ms; SIGTERM at 500 ms; SIGKILL at 1000 ms. `send()` AsyncIterable throws `TransportCancelled`. REPL not exited. Windows uses `tree-kill` package for cross-process-group signaling.
- [ ] AC-09: Mid-stream crash — mock streams "hello " then exits 1. "hello " reached caller; iterator throws `TransportCrashed { exitCode: 1, partial: true }`; F-08 prints `E-CLI-CRASH`; no retry; no fallback.
- [ ] AC-10: Ollama HTTP — `POST /api/chat` with `stream: true` to `127.0.0.1:11434`; NDJSON chunks stream to `AsyncIterable<TokenEvent>`; 30 s timeout via `AbortSignal.timeout(30_000)` → `HttpTimeout`; connection refused → `CliMissing`-equivalent.
- [ ] AC-11: PID-marker with start-time defeats reuse — fabricate a stale PID-marker for the current shell PID with an old start-time; ulm does NOT kill the current shell; stale entry pruned silently.
- [ ] AC-12: REPL exit kills all warm ACP children within 1 s; no orphans (verified by polling `ps -p <pid>` for 2 s); PID-marker file removed.
- [ ] AC-13: Capability matrix is read from state.toml (F-04), never re-detected mid-session.
- [ ] AC-14: Bench `npm run bench:transport` (tinybench) runs ≥ 1000 turns per transport against a no-op mock provider; reports p50/p95/p99 with 95% CI; CI fails if exec p95 > 50 ms or ACP p95 > 10 ms or compounded regression across dims > 20%.
- [ ] AC-15: Stderr credential redaction — mock writes `Authorization: Bearer abc123xyz` to stderr; F-08 `redact.scrub` called on every line before yielding `TokenEvent.stderr`; caller sees `[REDACTED]`.
- [ ] AC-16: Concurrent `send()` on same transport — second throws `TransportBusy` (D-10).
- [ ] AC-17: Forward-compat — stub `DaemonSocketTransport` delegating to `ExecTransport` compiles; all transport ACs pass when factory swaps to it.
- [ ] AC-18: Windows argv — prompts containing `"` and `\` and `&` round-trip safely via `spawn(cmd, [args], { shell: false })`; no injection (D-07).

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | Transport-layer overhead per turn ≤ 50 ms exec, ≤ 10 ms ACP, measured by `tests/bench/transport_overhead.ts` (tinybench) over ≥ 1000 samples on `ubuntu-latest`; informational on `macos-latest` / `windows-latest`. Compounded regression cap 20% per PR. |
| Spawn timing | Exec: 60 s wall-clock per turn (`ULM_TURN_TIMEOUT` override). ACP: no aggregate cap; 30 s no-byte-received kill; `ping` every 10 s. |
| Cancellation | First Ctrl-C: SIGINT (or Windows `tree-kill` for process-group semantics) → 500 ms → SIGTERM → 500 ms → SIGKILL. Total ≤ 1.6 s. Second Ctrl-C within 1 s exits ulm. |
| Browser support | N/A |
| Quota enforcement | ulm does not rate-limit (§7.6); provider 429s surface verbatim after credential redaction. |
| Accessibility | Streaming respects NO_COLOR; spinner pre-first-byte only. |
| Security | Argv-only spawn enforced by CI grep on `src/transport/` (AC-02); `shell: false` mandatory; env denylist applied **before** `spawn()` via shared `src/spawn/index.ts` helper (D-02); PID-reuse defense via OS-specific start-time match in `src/pid/index.ts` (D-06); stderr passed through F-08 redactor on every line (D-09). |
| Forward-compat | Interface must compile and pass tests with a stub `DaemonSocketTransport` (delegates to `ExecTransport`, no real socket). Proves the seam holds for PRD §9.4. |
| Concurrency | Exactly one active subprocess per (provider, ulm-process). Concurrent `send()` on the same transport instance throw `TransportBusy`. |
| Portability | Pure JS + `tree-kill` (~3 KB, cross-platform process-tree signaling). Optional `ffi-napi` for the PID start-time shim (D-06); if `ffi-napi` is rejected on install-footprint grounds, shell out to `ps`/`wmic` as a fallback. Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. |

## §5 Data Model

> Session-ID lookup goes through `state-store` (F-04). No own schema.

## §6 Interface Contracts

> Not applicable — `Applies` does not include `interface-contracts`. The `ProviderTransport` TypeScript interface is an internal seam; ACP frame layout is governed by the upstream ACP spec, not authored here.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit (vitest) | `ProviderTransport` shape | TS compiler accepts `const t: ProviderTransport = new ExecTransport(...)`; `for await (const ev of t.send(...))` typechecks |
| TC-02 | Unit | Env denylist glob matcher | `OPENAI_API_KEY`, `MY_TOKEN`, `FOO_SECRET`, `BAR_PASSWORD`, `AWS_ACCESS_KEY_ID` denied; `AWS_REGION`, `PATH`, `HOME` allowed; case-insensitive on Windows |
| TC-03 | Unit | Argv-only construction | `ExecTransport.buildSpawnArgs()` returns `[absolutePath, [...args], { shell: false, stdio: 'pipe', env: filteredEnv }]` |
| TC-04 | Integration | node-pty harness — exec happy path | Spawn `tests/fixtures/noop-provider.mjs`; iterator yields content; child exits 0 |
| TC-05 | Integration | node-pty harness — exec crash | Provider exits 1 after partial output; partial reached caller; iterator throws `TransportCrashed`; no retry |
| TC-06 | Integration | Exec timeout | 70 s sleeping provider, default timeout; kill at 60 ± 1 s; `CliTimeout` thrown |
| TC-07 | Integration | Mock JSON-RPC peer — ACP handshake | Init handshake completes; version negotiation asserted |
| TC-08 | Integration | Mock peer — keepalive count | 60 s idle, 5–7 `ping` requests on the wire |
| TC-09 | Integration | Mock peer — silent kill | Peer accepts handshake then `pause()`s stdin; subprocess killed at 30 ± 1 s |
| TC-10 | Integration | Mock peer — long think with pings | Peer replies to pings but no content for 60 s; no kill |
| TC-11 | Integration (nock) | Mock HTTP — Ollama happy path | `nock('http://127.0.0.1:11434').post('/api/chat')...` returns NDJSON; tokens stream through; verifies `stream: true` body |
| TC-12 | Integration | Mock HTTP — Ollama refused | Nothing on `:11434`; error within 1 s |
| TC-13 | Integration | Ctrl-C escalation | SIGINT at t=0, SIGTERM at 500 ± 50 ms, SIGKILL at 1000 ± 50 ms; child reaped |
| TC-14 | Integration | Env leak | 5 denylisted + 3 allowed; child prints `process.env`; diff against expected allowlist |
| TC-15 | Integration | PID-reuse defense | Fake stale PID-marker for current shell PID with fabricated old start-time; ulm does NOT kill the current shell |
| TC-16 | Integration | Concurrent send | Two concurrent `send()` on same transport; second throws `TransportBusy` |
| TC-17 | Bench (tinybench) | Exec overhead 1000-sample | p95 ≤ 50 ms on `ubuntu-latest` |
| TC-18 | Bench | ACP overhead 1000-sample | p95 ≤ 10 ms on `ubuntu-latest` |
| TC-19 | E2E | Stub-daemon impl forward-compat | `DaemonSocketTransport` stub compiles; all ACs pass when factory swaps |
| TC-20 | Unit | Stderr redaction wiring | Inject `Authorization: Bearer xyz` on stderr; F-08 `scrub()` called; caller sees `[REDACTED]` |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-ulm.md §6 — F-02; §5.1, §5.1.1, §5.1.2, §7.1, §7.2, §9.4
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** [provider-discovery, error-surfaces]

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | PRE-02 — which of claude/codex/gemini ship ACP? | backend-lead | Open | Resolved by PRD PRE-02 (2026-06-13). If PRE-02 resolves with zero ACP providers, AC-06/07/09 ACP variants become mock-only smoke tests; feature still ships. |
| Q-02 | ACP version negotiation — which protocol version does ulm advertise? | backend-lead | Open | Resolve alongside PRE-02. Affects AC-07 keepalive format if pre-1.0 ACP diverges. Target 2026-06-13. |
| Q-03 | Windows console signal — does `tree-kill` correctly propagate to Node child trees for ACP processes spawned without `detached: true`? | backend-lead | Open | AC-08 may need `detached: true` + `process.kill(-pid)` group semantics. Resolve via first Windows CI run of TC-13. |
| Q-04 | Bench-harness CI flakiness budget — gate on p95 only and report p99 informationally? | perf-specialist | Open | Resolve after first 5 nightly bench runs measure real noise floor. |
| Q-05 | PID start-time shim: `ffi-napi` vs shell-out fallback? `ffi-napi` adds ~500 KB to install footprint (G-06) | backend-lead | Open | Lean shell-out (`ps -o lstart=` on Unix, `wmic process where pid=N get CreationDate` on Windows) to stay zero-native-dep. Resolve before F-02 implementation start. |

## §10 Implementation Notes

- The interface surface is the load-bearing piece for the §9 daemon path. Anything that requires sharing state inside one ulm process via module-level globals will need re-architecting when the daemon ships — keep transport state ownership inside the interface impls.
- Capability detection (cached in F-04 state.toml) writes the chosen transport; this feature only reads that value and never re-detects mid-session.
- D-08 in-tree `acp-frame` module avoids pulling a JSON-RPC crate — ACP framing is small (~150 lines TypeScript) and stable. Most npm JSON-RPC packages assume HTTP transport.
- The shared `src/spawn/index.ts` helper (D-02) is the single point of env-denylist application — every transport's spawn must go through it. Two implementations diverge; one bug = one CVE.
- D-07 Windows quoting: never use `{ shell: true }` for prompt content. The default `spawn(cmd, [args])` form passes args directly to `CreateProcessW` without shell interpretation. CI grep enforces.
- `tree-kill` is the de facto npm package for cross-platform process-tree signaling; ~3 KB, no native deps. Required because Node's `process.kill(pid)` does not signal child trees on Windows.
- PID start-time shim (D-06): `ffi-napi` was considered for cleaner cross-platform API but adds ~500 KB to install footprint. The shell-out fallback is cheaper but pays a `child_process.execFile` per check. Decision deferred (Q-05) — measure both before committing.
