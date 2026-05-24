# Session Management — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** Medium
**Applies:** []
**Touches:** [src/sessions/**]
**Prototype:** N/A
**Agents:** backend-lead, ux-specialist, testing-lead
**Source:** docs/prds/2026-05-23-bab.md §6 — F-05; §5.5.2, §5.5.3, §4.5, §4.9.1, §3.2 PRE-03
**Last updated:** 2026-05-23

---

## §1 Problem Statement

Each provider CLI keeps its own per-conversation session storage (`~/.claude/projects/`, similar for codex/gemini). bab's promise in PRD §5.5.2 is to track the last session ID per provider so the next bab launch resumes where the user left off — and to let the user explicitly start fresh (`/new`), list recent sessions (`/sessions`), or jump back into a specific one (`/resume <id>`). This feature implements those three commands, the per-provider session-store readers, and the `/sessions` output format from §4.9.1. It stores ID strings only — never conversation content (G-02, §5.5.1).

## §2 Scope

### In Scope
- `/new` — clears `[sessions].<provider>.id` (sets to empty string per D-04) via F-04 atomic write per-key callback; next turn invokes the provider without `--resume`.
- `/sessions` — lists up to 20 most-recently-used session IDs for the current provider, formatted per §4.9.1 (ID 12, LAST_USED 20, PREVIEW 40, sorted newest first, fixed-width columns).
- `/resume <id>` — validates `<id>` exists in the provider's store; if yes, writes `[sessions].<provider>.id = <id>` via F-04; next turn invokes provider with `--resume <id>` (D-05).
- Per-provider session-store readers (read-only): walk each provider CLI's storage path to enumerate IDs + `LAST_USED` (file mtime per D-02) + first-user-message preview (first 40 bytes per D-03, cached at `$BAB_CACHE_DIR/preview/<provider>/<id>` keyed by session-file mtime per D-06).
- Empty-list rendering: `No saved sessions for provider 'X'.` (verbatim).
- Warning channel: provider store unreadable / layout changed → empty-list + one-line `⚠` warning on stderr (D-07, D-08).
- ID display truncation with `…` (U+2026) at position 11; PREVIEW truncated with `…` at position 39 (D-01).
- Integration with F-04 for the `[sessions]` table and with F-02 for the resume invocation.

### Out of Scope
- Cross-provider session merging — explicit non-goal (§5.5.3).
- Conversation content storage in bab — explicit non-goal (§5.5.1).
- The `/pipe` v2 candidate (§15) for moving context between providers.
- The state.toml schema itself — owned by F-04.
- Provider CLI's own session-management commands (e.g. `claude --list-sessions`) — bab reads the on-disk store directly; if a provider changes its layout, `/sessions` and `/resume` break for that provider until bab is updated (PRD §5.5.2 + PRE-03).
- Per-provider store path discovery + format — DEF-01 (depends on PRE-03 outcome; each provider's on-disk layout is an undocumented internal contract).

## §3 Acceptance Criteria

- [ ] AC-01: `/sessions` with a populated provider store renders exactly three columns `ID  LAST_USED  PREVIEW` at fixed widths 12 / 20 / 40, separated by two spaces, sorted by LAST_USED descending, capped at 20 rows. Snapshot-tested via vitest against the §4.9.1 spec.
- [ ] AC-02: Any `ID` longer than 12 chars truncates with `…` (U+2026) at position 11; any `PREVIEW` longer than 40 chars truncates with `…` at position 39. `LAST_USED` is RFC 3339 UTC zulu form (e.g. `2026-05-23T14:02:11Z`); never local time, never offset.
- [ ] AC-03: `/sessions` with an empty provider store prints exactly `No saved sessions for provider '<X>'.` (verbatim including period).
- [ ] AC-04: `/sessions` when the provider's storage path is missing or unreadable prints the empty-list message + a one-line stderr warning prefixed `⚠` (ASCII `[!]` per §4.7); never throws uncaught, never exits the REPL.
- [ ] AC-05: `/sessions` p95 render time ≤ 100 ms (hot FS) for 20 rows; cold-cache (preview cache miss on all 20) p95 ≤ 250 ms. Measured via tinybench against a fixture provider store.
- [ ] AC-06: `/resume <known-id>` writes `[sessions].<provider>.id = <id>` through F-04's atomic-write per-key API, returns to prompt, and the **next** turn invokes F-02 with `--resume <id>` (or the provider's documented equivalent per §5.1.1 matrix).
- [ ] AC-07: `/resume <unknown-id>` prints `✗ unknown session id '<id>' for provider '<X>'.` and does **not** mutate `[sessions].<provider>`. state.toml mtime unchanged.
- [ ] AC-08: `/resume` with no argument prints `✗ /resume requires a session id. See /sessions.` (§4.8 spirit: errors return to prompt, never crash).
- [ ] AC-09: `/new` clears `[sessions].<provider>.id` (sets to empty string `""` per D-04 — schema is fixed-shape per §5.5.2) via F-04 atomic write. The next turn invokes the provider with no `--resume` flag.
- [ ] AC-10: `/new`, `/sessions`, `/resume` are no-ops with an explanatory `NoProvider` error when no provider is selected.
- [ ] AC-11: Switching providers (`/provider gemini` after `/provider claude`) then running `/sessions` returns gemini's sessions only — no Claude IDs leak (§5.5.3 verified).
- [ ] AC-12: bab never writes into any provider's session-store directory during `/sessions` or `/resume`. Test asserts via mtime snapshot of the fixture store before/after.
- [ ] AC-13: `/sessions` output contains **no** conversation content beyond the 40-char first-user-message preview; the body of the conversation is never read into bab's process memory beyond the preview line (G-02 / §5.5.1). Enforced by reading provider files with an explicit byte cap (`fs.read` with `length: 4096`).

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | `/sessions` p95 ≤ 100 ms for 20 rows on hot FS; cold-cache p95 ≤ 250 ms. |
| Error budget | Provider store missing / unreadable / corrupt / encoding-broken → empty-list rendering + single `⚠` stderr warning; never throws uncaught, never exits REPL. `/resume` on bad ID is a non-mutating error, **not** a state-store write. |
| Browser support | N/A |
| Quota enforcement | N/A |
| Accessibility | Fixed-width columns; PREVIEW truncated with `…` (UTF-8) or `...` (ASCII fallback per §4.7); no information conveyed only by color; screen-reader output: each row read as `id <ID>, last used <LAST_USED>, preview <PREVIEW>`. |
| Security | Read-only access to provider stores (`fs.open` with `'r'` mode); ID strings + timestamps + 40-byte preview slice only; conversation content never copied into bab process memory beyond the preview cap; bounded byte buffer (`fs.read` with `length: 4096` max per file). |
| Concurrency | `/new` and `/resume` go through F-04 per-key save via `stateStore.save(state => state.sessions[provider].id = ...)`; never whole-file overwrite. |
| Compatibility | Provider-store readers tolerate timestamp parsing failure (fall back to file mtime via `fs.stat`) and non-UTF-8 preview bytes (replace with U+FFFD via `TextDecoder('utf-8', { fatal: false })`, do not throw). |
| Portability | Pure JS — `node:fs`, `node:path`. Runs on Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. |

## §5 Data Model

> The `[sessions]` table in state.toml is owned by F-04 — inline tables with `id` + `last_used` per provider (F-04 D-06). This feature is a consumer. Provider-side session storage layout is owned by each provider CLI (PRE-03; DEF-01).

## §6 Interface Contracts

> Not applicable — `Applies` does not include `interface-contracts`. `/sessions` output format is specified in PRD §4.9.1; ACs in §3 assert against it verbatim.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit (vitest) | Format 20 fake sessions with mixed-length IDs/previews | Output matches §4.9.1 byte-for-byte; `toMatchSnapshot()` |
| TC-02 | Unit | Long ID (16 chars) and long preview (80 chars) | Truncated with `…` at code-point positions 11 and 39 respectively |
| TC-03 | Unit | Empty provider store directory | Exactly `No saved sessions for provider 'claude'.` |
| TC-04 | Unit | Missing provider store directory (path does not exist) | Empty message + `⚠` warning on stderr; no throw |
| TC-05 | Unit | ASCII fallback (`LANG=C`) | `…` becomes `...`; `⚠` becomes `[!]` |
| TC-06 | Integration | `/resume <known-id>` then send a prompt | F-02 invoked with `--resume <known-id>`; state.toml updated atomically |
| TC-07 | Integration | `/resume <unknown-id>` | Error printed; state.toml mtime unchanged |
| TC-08 | Integration | `/resume` (no arg) | Error printed; state.toml mtime unchanged |
| TC-09 | Integration | `/new` then send a prompt | F-02 invoked **without** `--resume`; `[sessions].<provider>.id` is `""` in state.toml |
| TC-10 | Integration | `/provider claude`, `/sessions`, `/provider gemini`, `/sessions` | Two disjoint result sets; no Claude ID appears in gemini output |
| TC-11 | Bench (tinybench) | 20-row hot-FS render | p95 ≤ 100 ms over 1000 invocations on `ubuntu-latest` |
| TC-12 | Bench | 20-row cold-cache render | p95 ≤ 250 ms |
| TC-13 | Security | Read-only contract | Provider-store dir mtimes before/after `/sessions` and `/resume` identical (`fs.statSync`) |
| TC-14 | Security | Conversation-content non-leakage | Byte-count assertion: `fs.read` calls bounded to 4096 bytes per session file; snapshot of bab stdout contains zero strings present in the session body beyond the preview slice |
| TC-15 | Concurrency | Parallel REPL `/resume` + one-shot `/new` (vitest concurrent) | Both writes converge through F-04 per-key merge; final state.toml is well-formed and reflects the later of the two |
| TC-16 | Unit | Non-UTF-8 bytes in a session preview | Replaced with U+FFFD via `TextDecoder`; no throw |
| TC-17 | Unit | Timestamp parse failure in a session file | Falls back to file mtime; row still rendered |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-bab.md §6 — F-05; §5.5.2, §4.5, §4.9.1
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** [provider-transport, state-store]

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | PRE-03 — is `--resume <id>` semantic actually consistent across claude/codex/gemini? | backend-lead | Open (blocked by PRE-03) | Pending PRE-03 closure (PRD §3.2) |
| Q-02 | Should `/sessions` show sessions from **all** of a provider's project directories, or only the one matching `$PWD`? | backend-lead | Open | Claude Code namespaces by project path; conflating projects would surprise users. Default: scope per-project unless the provider has no project concept. Resolve before `/vskit:spec-to-tasks`. |
| Q-03 | LRU cap and cache directory hygiene for the preview cache (D-03/D-06) | backend-lead | Open | Stay under §7.1 cache-dir norms; concrete number proposed = 1000 entries. |
| Q-04 | Should the per-provider session-store reader live in this feature or in F-02? | backend-lead | Open | Cleaner ownership argues F-02 (per-provider knowledge already there); coupling argues here. Resolve before `/vskit:spec-to-tasks`. |

## §10 Implementation Notes

- The 20-row cap in §4.9.1 is a UX choice, not a storage limit — older sessions still resumable via direct `/resume <id>` if the user knows the ID.
- The PREVIEW column requires reading the first user message of each session. Cache aggressively per session-file mtime to keep `/sessions` snappy (D-03/D-06).
- Per PRE-03, treat any provider's session-store layout as a load-bearing external contract; surface a clear `⚠` warning if a provider's storage path no longer exists or has changed shape (D-07).
- Implementation uses `node:fs.promises.readdir` + `fs.promises.stat` for enumeration; `fs.promises.open(..., 'r')` + `fileHandle.read({ length: 4096 })` for bounded preview reads.
