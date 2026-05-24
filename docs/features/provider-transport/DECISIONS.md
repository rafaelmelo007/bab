# Decisions — Provider Transport

**Feature:** provider-transport
**Source:** /vskit:critique-spec provider-transport (2026-05-23, self-review via general-purpose agent playing backend-lead + perf-specialist + security-specialist + testing-lead + prompt-engineer lenses); Node.js retrofit 2026-05-23 after PRD §13 Q-06 flipped Rust → Node.js.
**Last updated:** 2026-05-23

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | backend-lead | What does the stream item type carry? | Discriminated union: `type TokenEvent = { kind: 'content', text: string } \| { kind: 'stderr', text: string } \| { kind: 'meta', frame: MetaFrame }`; returned as `AsyncIterable<TokenEvent>` (so callers use `for await (const ev of t.send(...))`). | Lets ACP surface tool-calls / usage frames without leaking transport details; exec mode emits only `content` and `stderr`. `AsyncIterable` is the Node-idiomatic streaming primitive — works with `for await…of`, integrates with `Readable.from`, supports back-pressure. | SPEC §3 AC-01 | — |
| D-02 | 2026-05-23 | security-specialist | Where does the env denylist live — transport or shared module? | Shared `src/spawn/index.ts` helper called from every `ExecTransport` and `AcpTransport` spawn site. Single source of truth, tested once. | Two implementations diverge; one bug = one CVE. | SPEC §4 Security NFR | — |
| D-03 | 2026-05-23 | backend-lead | PTY vs pipe for stdio in exec mode | Pipes by default (`stdio: 'pipe'` in `child_process.spawn`). PTY (via `node-pty` for test harness only) only if a provider proves to require it. | Pipes deterministically separate stdout/stderr; PTY conflates them and adds buffering surprises. node-pty also requires native prebuilds — unwanted in production. | SPEC §5.1.2 stdio framing | — |
| D-04 | 2026-05-23 | backend-lead | Does cancellation race with stream consumer? | `cancel()` calls `AbortController.abort()` on the shared signal; spawn task checks `signal.aborted` at every stdio read; the `AsyncIterable` throws `TransportCancelled` on next iteration. No double-deliver. | Cleanest cancellation contract; `AbortController` is the Node-native idiom (Node 16+); integrates with `fetch`, `setTimeout`, `child_process.spawn({ signal })`. | SPEC §3 AC-08 | — |
| D-05 | 2026-05-23 | perf-specialist | Bench harness mock provider shape | A 50-line TypeScript binary `tests/fixtures/noop-provider.mjs` (and `noop-acp-peer.mjs`) emitting a fixed-length reply with deterministic timing; runs under `node` directly (no compile step). | Removes provider variance from overhead measurement; portable across CI matrix (Linux/macOS/Windows all run Node). | SPEC §3 AC-14; TC-17, TC-18 | — |
| D-06 | 2026-05-23 | security-specialist | PID-reuse start-time portability | Single `processStartTime(pid: number): Promise<number>` shim in `src/pid/index.ts` with per-OS impl: Linux reads `/proc/<pid>/stat` field 22; macOS shells out to `ps -p <pid> -o lstart=`; Windows shells out to `wmic process where (ProcessId=<pid>) get CreationDate`. `ffi-napi` alternative tracked as Q-05. | Avoid spreading platform `process.platform` checks across transport code. Shell-out is the zero-native-dep path (PRD G-06 install-footprint sensitive). | SPEC §5.1.2 cleanup | — |
| D-07 | 2026-05-23 | security-specialist | Argv quoting on Windows | Always use `child_process.spawn(cmd, args, { shell: false })` (default). Never use `{ shell: true }` for prompt content. CI grep on `src/transport/`, `src/spawn/`, `src/oneshot/` blocks `shell: true`. | Prevents accidental injection via prompt containing `"`, `\`, `&`, `|` on Windows. `spawn` with `shell: false` calls `CreateProcessW` directly with argv array, bypassing shell interpretation. | SPEC §3 AC-02, AC-18 | — |
| D-08 | 2026-05-23 | backend-lead | ACP framing library | Build a thin in-tree `src/transport/acp/frame.ts` module (length-prefixed JSON-RPC reader/writer ~150 lines) rather than pulling a JSON-RPC npm package. Tested against captured frames in `tests/fixtures/acp-corpus/`. | Most npm JSON-RPC packages assume HTTP/WebSocket transport; ACP framing is small and stable enough to own. Avoids a dep on the install-footprint budget. | SPEC §5.1.2 stdio framing | — |
| D-09 | 2026-05-23 | security-specialist | Where does stderr get redacted? | F-08 owns `redact.scrub`; transport calls it on every stderr line before yielding `TokenEvent { kind: 'stderr', text }`. Stream consumers receive redacted text only. | Single redaction point; can't be bypassed by a future caller. | SPEC §3 AC-15; TC-20 | — |
| D-10 | 2026-05-23 | backend-lead | Concurrent `send()` policy | One in-flight `send()` per transport instance; second throws `TransportBusy`. Caller (F-01 REPL) is responsible for serialization. | Matches §7.1 "1 subprocess per provider per bab process"; simpler than internal queue. | SPEC §4 Concurrency NFR; AC-16 | — |
| D-11 | 2026-05-23 | backend-lead | Cross-platform process-tree kill | Use `tree-kill` npm package (~3 KB, no native deps) for `cancel()` on Windows; `process.kill(pid, signal)` on Unix is sufficient. | Node's built-in `process.kill` does not signal child trees on Windows; provider CLIs may spawn helper processes (e.g. `npm` wrappers) that need to die too. | SPEC §4 Cancellation NFR; AC-08 | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | PTY/vt100 screen-scraping transport | PRD Q-02 explicitly defers until PRE-01/02 force it | PRE-02 resolves and at least one provider lacks both ACP and clean `-p` |
| DEF-02 | Daemon socket transport implementation | PRD §9 — v2 only. v1 only needs the trait seam (AC-17 + TC-19) | v2 planning |
| DEF-03 | ACP authoring — owning the spec | bab consumes upstream ACP, doesn't author framing rules | If upstream ACP fragments or stalls |
| DEF-04 | Multi-subprocess-per-provider (parallel turns) | §7.1 spawn cap of 1 | v2 daemon mode |
| DEF-05 | Connection pooling for Ollama HTTP | v1: new `fetch` per turn is fine (localhost, sub-ms connect) | Profile shows connect overhead > 2 ms p95 |
| DEF-06 | Pluggable redaction patterns per transport | F-08 owns global pattern list; no transport-specific patterns yet | Telemetry shows transport-specific leak class |
