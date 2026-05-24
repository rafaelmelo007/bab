# Decisions — Provider Discovery

**Feature:** provider-discovery
**Source:** /vskit:critique-spec provider-discovery (2026-05-23, self-review via general-purpose agent playing backend-lead + security-specialist + testing-lead + prompt-engineer lenses); Node.js retrofit 2026-05-23 after PRD §13 Q-06 flipped Rust → Node.js.
**Last updated:** 2026-05-23

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | backend-lead | SHA-256 implementation (resolves Q-01) | `node:crypto.createHash('sha256')` — built-in | Built-in, zero install-footprint cost (PRD G-06), maintained by Node core. No npm dep needed. | SPEC §9 Q-01 resolved | — |
| D-02 | 2026-05-23 | backend-lead | Parallelism primitive for the 4 probes | `Promise.all` on the event loop with per-probe `AbortController` + `setTimeout(500)` | Node's event-loop model handles the four concurrent subprocess spawns natively; `AbortController` (Node 16+) is the idiomatic way to cancel `execFile`. No worker_threads needed (probes are I/O-bound). | SPEC §4 Concurrency NFR | — |
| D-03 | 2026-05-23 | backend-lead | Version-string parsing strategy | Best-effort regex `/(\d+)\.(\d+)\.(\d+)/` per provider; raw-string fallback on no-match | Each provider's `--version` format is unstable; ulm must not crash on format change. Raw preserved for forensics; semver computed lazily. | SPEC §10 | — |
| D-04 | 2026-05-23 | security-specialist | Path canonicalization | `fs.realpath()` (Node built-in) at detection time; store canonical path | Defeats `~/.local/bin/claude → /tmp/evil` symlink swap; matches PRD §5.4 "absolute resolved path". Async variant (`fs.promises.realpath`) integrates with `Promise.all` from D-02. | SPEC §3 AC-13; F-04 DBSCHEMA `[providers.<name>].absolute_path` semantics | — |
| D-05 | 2026-05-23 | security-specialist | Hash re-verification cadence | Every launch (not every turn) | Per-turn rehash adds I/O cost and SHA-256 is explicitly informational. Launch-time check matches §5.4 PATH-poisoning re-verify cadence. | SPEC §10; SPEC §3 AC-06 | — |
| D-06 | 2026-05-23 | backend-lead | Ollama HTTP probe shape | `fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(300) })` with 300 ms sub-budget inside the 500 ms probe | Distinguishes "binary present, daemon down" (⚠) from "binary missing" (✗). Uses Node 18+ built-in `fetch`; no `node-fetch` dep needed. | SPEC §3 AC-08; AC-13 | — |
| D-07 | 2026-05-23 | testing-lead | `ProviderVersion` warning deduplication | Process-local `Set<string>` (keyed by provider name); cleared on process exit | PRD §4.8 says "once per session"; discovery emits, F-08 dedups the print. | F-08 INTERFACE-CONTRACTS cross-ref | — |
| D-08 | 2026-05-23 | backend-lead | Capability detection for `acp` on claude | Spawn `claude --acp` (or PRE-02 resolution) via `child_process.spawn`, send a single JSON-RPC `initialize` over stdio, expect response within 300 ms (`AbortSignal.timeout(300)`); success ⇒ `transport: "acp"`; failure → `exec` fallback | Functional probe is the only honest test; `--version` parsing cannot tell us if ACP negotiation works. Blocked on PRE-02. | SPEC §3 AC-08 | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | Background re-discovery while REPL is idle (revalidate every 10 min) | v2; launch-time check is sufficient for v1 | v2 planning |
| DEF-02 | Hash algorithm agility (BLAKE3 or SHA-3) | v2; SHA-256 is fast enough and PRD §5.4 explicitly names it. Changing requires schema_version bump. | v2 planning |
| DEF-03 | User-facing `/discover` command to force re-probe | v2; v1 ships automatic re-verification only | v2 planning |
| DEF-04 | Discovery telemetry events wired to F-10 (`probe_done`, `hash_mismatch`) | Discovery emits via `node:diagnostics_channel`; F-10 subscribes during F-10 implementation | F-10 implementation |
