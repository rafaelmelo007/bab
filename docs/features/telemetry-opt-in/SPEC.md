# Telemetry Opt-In — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** Low
**Applies:** [interface-contracts]
**Touches:** [src/telemetry/**]
**Prototype:** N/A
**Agents:** backend-lead, security-specialist, devops-lead, testing-lead
**Source:** docs/prds/2026-05-23-bab.md §6 — F-10; §10.1, §10.2, §10.3
**Last updated:** 2026-05-23

---

## §1 Problem Statement

The PRD's founder-conviction bet (§3.1) is falsified or validated by §10.1 adoption signals — first-week retention, mean providers used per installation, crash-free run rate. None of those can be measured from GitHub stars or package-registry numbers alone; they require opt-in instrumentation inside running bab installs. This feature implements the `bab telemetry enable|disable|local` subcommand, the §10.2 event allowlist, the anonymous 128-bit install ID, the async POST to the telemetry endpoint with local-cache spool-and-retry, and the `BAB_NO_TELEMETRY=1` kill switch. It must never block the REPL, never send prompt or session content, and never call out without an explicit opt-in.

## §2 Scope

### In Scope
- `bab telemetry enable` — generates 128-bit anon ID via `node:crypto.randomBytes(16).toString('hex')` (D-01); prints verbatim "what is/isn't sent" text contract; persists `[telemetry]` block via F-04.
- `bab telemetry disable` — purges cache + sets `enabled = false` + `mode = "off"` + zeroes `anon_id` (D-07 secure overwrite).
- `bab telemetry local` — sets `mode = "local"`; events append to `$BAB_CACHE_DIR/telemetry.jsonl` only (no HTTP sender).
- Event allowlist per §10.2: `install`, `run_start`, `provider_set`, `turn_complete`, `error_<CODE>` (one of the 13 §4.8 codes with hyphens → underscores per Q-03 / D-?), `crash`.
- Per-event allowed fields: `timestamp` (RFC3339 UTC ms precision), `anon_id`, `os`, `bab_version`, `event_name`, `event_data` (strict allowlist tested in `tests/telemetry/`).
- Endpoint: `https://telemetry.bab.<TBD per Q-08>/v1/event` — payload schema in [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md).
- Build-time-constant endpoint URL (D-04) — no runtime override (anti-exfiltration).
- HTTPS-only + TLS 1.2+; `fetch` validates cert chain by default.
- Async emit via MPSC channel pattern (in Node: `EventEmitter` + worker `fetch`) — never blocks REPL turn (≤ 1 ms p95 emit).
- Retry per event: 3 attempts at 250 ms / 1 s / 4 s (D-02); after 3rd failure → park in local-cache for drain.
- Drain loop: wake on cache non-empty + endpoint reachable; ≥ 95% drain within 24 h of network availability (§10.3 SLO).
- Local-cache file at `$BAB_CACHE_DIR/telemetry.jsonl`, mode 0600, 5 MB cap with FIFO trim (D-03).
- Kill switches: `BAB_NO_TELEMETRY=1` overrides config; `bab telemetry disable` overrides config.
- Stripping of unknown event_data keys with one WARN log (D-06 — strip-and-continue, not refuse-and-drop).

### Out of Scope
- Prompt content, conversation content, session IDs, file paths, env var values — explicit non-goals (§10.2). Enforced by AC-10 negative corpus.
- Crash-stack symbolication (DEF-03 / PRD Q-09).
- Endpoint hosting infra (PRD Q-08, deferred via DEF-01).
- PII or attribution.
- Update-check (PRD Q-10) — separate path; shares throttle/cache mechanism but not telemetry endpoint.

## §3 Acceptance Criteria

- [ ] AC-01: `bab telemetry enable` writes `[telemetry].enabled = true`, `mode = "remote"`, generates `anon_id` as 32-char lowercase hex from `node:crypto.randomBytes(16).toString('hex')`.
- [ ] AC-02: `bab telemetry enable` prints, verbatim, the §4 "what is/isn't sent" text contract before persisting opt-in. Exact string fixture-tested in `tests/telemetry/enable_output.txt`.
- [ ] AC-03: `bab telemetry enable` exits non-zero and persists nothing if the user does not type `yes` (case-insensitive) at the confirmation prompt; the verbatim list is shown before the prompt, never after persistence.
- [ ] AC-04: `bab telemetry disable` sets `enabled = false`, deletes `$BAB_CACHE_DIR/telemetry.jsonl` and any in-flight retry queue, and zeroes `anon_id` to empty string in state.toml. Subsequent `enable` generates a *new* anon_id.
- [ ] AC-05: `bab telemetry local` sets `mode = "local"`; emitted events append to `$BAB_CACHE_DIR/telemetry.jsonl` only — HTTP sender not started.
- [ ] AC-06: With telemetry disabled or `mode = "off"`, no network sockets are opened from the telemetry module (asserted via Node's `net.Socket.connect` spy or by running under a network-deny sandbox). Default state immediately after first launch is `enabled = false`.
- [ ] AC-07: `BAB_NO_TELEMETRY=1` (any non-empty value other than `0` / `false`) overrides config: no emit, no local-cache write, no socket open — even with `enabled = true` on disk. Tested with both `mode = "remote"` and `mode = "local"`.
- [ ] AC-08: Only the six event names in §10.2 are emittable: `install`, `run_start`, `provider_set`, `turn_complete`, `error_<CODE>` (matching §4.8 catalog with hyphens → underscores), `crash`. Any other name passed to the emitter throws in dev / drops+logs in production. Negative corpus tested.
- [ ] AC-09: Event payloads conform to the schema in INTERFACE-CONTRACTS.md: exactly the six top-level keys. `event_data` restricted per per-event allowlist; unknown keys stripped, logged once at WARN, event continues with allowed subset (D-06).
- [ ] AC-10: **Forbidden-fields test:** negative corpus in `tests/telemetry/forbidden_corpus/` injects prompt content, conversation excerpts, session-ID UUIDs (regex `[0-9a-f]{8}-[0-9a-f]{4}-…`), absolute file paths (`/home/...`, `C:\...`), and env-var-shaped strings (`*_API_KEY=...`, `Bearer ...`) into every emit-site input. CI asserts none appear in any serialized JSON line across 100% of corpus entries.
- [ ] AC-11: Emit is non-blocking — `emit(event)` returns in ≤ 1 ms p95 by handing off to an async queue; REPL turn never awaits the HTTP POST. Verified by tinybench gate `tests/bench/telemetry_emit.ts`.
- [ ] AC-12: Endpoint transport is HTTPS-only with TLS 1.2+ and cert-chain validation. Build-time-constant URL (D-04); attempting to configure an `http://` endpoint at build time refuses to compile (TypeScript narrow type `https://${string}`).
- [ ] AC-13: On HTTP send failure (non-2xx, timeout > 2 s, DNS, connect refused), the event is appended to `$BAB_CACHE_DIR/telemetry.jsonl`. Per-event retry: 3 attempts with backoff 250 ms / 1 s / 4 s; after the third, the event remains in the cache for the drain loop. No event drops on first failure.
- [ ] AC-14: Drain loop wakes on cache non-empty + endpoint reachable; ≥ 95% of queued events drain within 24 h of reachability restoration (§10.3 SLO). Simulated-time integration test (vitest `vi.useFakeTimers`).
- [ ] AC-15: Local-cache file created with mode `0600` (Unix); inside user-only-DACL config dir (Windows, parent inherit per F-04 D-02). Reading more permissive modes logs a warning but does not block.
- [ ] AC-16: `anon_id` never appears in any log file, worklog entry, or stderr output. Scanned in integration tests. Anon ID rotation on `bab reset` is irrevocable: old ID overwritten via `buf.fill(0)` before state.toml rewrite (D-07).

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | Telemetry emit ≤ 1 ms p95 (async; non-blocking); endpoint reachable within 2 s for ≥ 99% (§10.3). Drain loop CPU overhead ≤ 0.5% averaged over 10 min when cache has 1000 events. |
| Error budget | Telemetry endpoint failure NEVER affects user-visible behavior — silent drop to local cache; ≥ 95% drain within 24 h of network availability. Local-cache file size capped at 5 MB; oldest events FIFO-trimmed when cap exceeded; trim event itself counted as a worklog entry, not a telemetry event. |
| Browser support | N/A |
| Quota enforcement | 3 attempts with exponential backoff per event (D-02), then park in cache for next drain trigger. |
| Accessibility | `bab telemetry enable` "what is/isn't sent" list is plain English; respects NO_COLOR. |
| Security | No prompt/session/path/env content ever transmitted; allowlist tested with negative-corpus in `tests/telemetry/`; 128-bit anon ID generated with `node:crypto.randomBytes(16)`; HTTPS-only with TLS 1.2+; build-time-constant endpoint URL (D-04 — no runtime exfiltration). Anon-ID rotation overwrites old value with `buf.fill(0)` before rewrite (D-07). bab's parent process (which spawns provider subprocesses) inherits the original denylisted env via F-02 D-02, so no env→event_data leakage path exists. |
| Portability | Pure JS — `node:crypto`, built-in `fetch` (Node 18+), `node:fs` for JSONL append. No native deps. Runs on Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. |

## §5 Data Model

> Opt-in flag, anon ID, and tri-state mode live in state.toml under `[telemetry]` (owned by F-04, F-10 writes per F-04 reserved-section contract). Local-cache file `$BAB_CACHE_DIR/telemetry.jsonl` is owned by this feature; format in INTERFACE-CONTRACTS.md.

## §6 Interface Contracts

Endpoint payload schema, local-cache format, and disclosure text are in [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md) (single source of truth per INV-1).

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit (vitest) | Anon ID generation | 128 bits via `node:crypto.randomBytes(16)`; 32-char lowercase hex; uniqueness across 10k generations |
| TC-02 | Unit | Event name allowlist | Emitting an unknown event_name throws in dev / returns `Err(UnknownEvent)` in prod; the six allowed names succeed |
| TC-03 | Unit | Per-event field allowlist | `event_data` for each event_name accepts only its keys per INTERFACE-CONTRACTS table; extra keys stripped + logged |
| TC-04 | Unit | Forbidden-fields corpus | 100% of negative corpus inputs (prompt fragments, session IDs, paths, env values, bearer tokens) absent from serialized output |
| TC-05 | Unit | Verbatim "what is/isn't sent" string | Output of `bab telemetry enable` matches `tests/telemetry/enable_output.txt` byte-for-byte (line-ending-normalized) |
| TC-06 | Unit | Kill switch | `BAB_NO_TELEMETRY=1` short-circuits emit before allowlist check; no JSONL write, no socket open |
| TC-07 | Integration | Opt-in flow | `bab telemetry enable` → `yes` → state.toml mutated atomically via F-04 contract; mode = "remote"; anon_id set |
| TC-08 | Integration | Disable purges cache | Pre-seed 100 events in JSONL → `bab telemetry disable` → file absent; subsequent enable creates new anon_id |
| TC-09 | Integration (nock) | Local mode never transmits | Mock HTTP server on `127.0.0.1`; `mode = "local"`; emit 10 events; assert 0 requests received and JSONL has 10 lines |
| TC-10 | Integration | Async non-blocking | Mock endpoint that hangs indefinitely; 100 emits return in p95 ≤ 1 ms each; REPL turn unaffected |
| TC-11 | Integration | Cache + retry + drain | Endpoint returns 503 for 24 simulated hours, then 204; ≥ 95% of queued events drained within next 24 simulated hours (vitest `vi.useFakeTimers`) |
| TC-12 | Integration | HTTPS-only enforcement | Build-time constant URL has TS type `\`https://${string}\``; attempting `http://` is a compile error |
| TC-13 | Integration | TLS 1.2+ enforcement | Mock TLS 1.0 endpoint rejected by `fetch` (Node default); mock TLS 1.2 endpoint accepted |
| TC-14 | Integration | File permissions | JSONL created at `0600` on Unix; user-only DACL on Windows via parent-dir inherit (F-04 D-02) |
| TC-15 | E2E (node-pty) | First-launch state | Fresh state.toml → telemetry off → no network activity for 5 min idle REPL |
| TC-16 | E2E | Crash event emit | Simulated throw in REPL turn → `crash` event written synchronously to JSONL (no network attempt); drained on next launch's first successful POST (per Q-02) |
| TC-17 | Bench (tinybench) | Emit overhead | p95 ≤ 1 ms emit-call; regression budget 10% |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-bab.md §6 — F-10; §10.1, §10.2, §10.3
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Interface Contracts:** [INTERFACE-CONTRACTS.md](./INTERFACE-CONTRACTS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** [repl-shell, state-store, error-surfaces]

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | User-visible behavior when `$BAB_CACHE_DIR` is unwritable | backend-lead | Open | Decision criterion: refuse-and-error vs degrade-to-in-memory-only. Tied to AC-15. Target 2026-06-30. |
| Q-02 | `crash` events on a throw — flushed synchronously (blocking exit) or async-written then drain on next launch? | backend-lead | Open | Synchronous flush risks blocking exit on a hung filesystem; async risks losing the very event. Likely synchronous-write-to-JSONL with no network attempt (drained on next launch). Target 2026-06-30. |
| Q-03 | §4.8 error codes converted to event_name — underscores or hyphens? | prompt-engineer | Resolved (2026-05-23) | Underscores (`error_CLI_MISSING`). JSON keys and metric names conventionally use underscores; `_` is `[a-zA-Z0-9_]+` regex-safe. |

## §10 Implementation Notes

- This feature ships *after* F-01 lands per the dependency graph — telemetry is meaningless until the REPL exists.
- Per §10.1 INV-3, telemetry-derived signals carry a `~` prefix when reported because opt-in coverage is partial. The numbers are estimates.
- The local-cache file is documented as user-readable but never shipped (per §7.2). `bab telemetry local` is the discoverable inspection path.
- The "what is/isn't sent" list printed by `bab telemetry enable` is a verbatim contract — changes require a SPEC update and a fixture refresh.
- D-04 build-time-constant URL: defined as `export const TELEMETRY_URL: \`https://${string}\` = "https://telemetry.bab..."` in `src/telemetry/endpoint.ts`. No env-var override path. Audit by `grep TELEMETRY_URL` in the published bundle.
- Implementation: TypeScript per PRD §13 Q-06. Async queue is a simple `Array<Event>` flushed by a `setInterval` worker; no `worker_threads` (single-threaded is fine for telemetry I/O).
