# State Store — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** High
**Applies:** [dbschema]
**Touches:** [src/state/**]
**Prototype:** N/A
**Agents:** backend-lead, db-architect, security-specialist, testing-lead
**Source:** docs/prds/2026-05-23-bab.md §6 — F-04; §5.2.1, §5.5, §7.4
**Last updated:** 2026-05-23

---

## §1 Problem Statement

bab stores user prefs and session IDs in `~/.config/bab/state.toml` (or platform equivalent). This feature owns that file: its schema, its atomic-write contract, its OS-level lockfile, its `0600` file mode, schema-version migrations with `.bak` rollback, and the per-key read-modify-write merge that lets a REPL and a one-shot run concurrently without losing each other's session writes. The store is what G-08 "zero credential surface" and the §5.5 "bab itself stores no conversation content" promises sit on top of.

## §2 Scope

### In Scope
- `state.toml` schema versioned with `schema_version = 1` (full schema in [DBSCHEMA.md](./DBSCHEMA.md)).
- Atomic write: tmp file + `fs.fsync(tmpFd)` + `fs.fsync(parentDirFd)` (Unix) / no-op (Windows uses `MoveFileEx` semantics) + `fs.rename(tmp, 'state.toml')` (per D-03).
- Cross-process lockfile via `proper-lockfile` npm package (or equivalent thin wrapper around `flock` / `LockFileEx`); writers acquire, readers do not (D-04). Lockfile inherits the same 0600 / user-only ACL.
- Per-key merge inside the write lock: re-read on-disk state, merge in-memory changes per-key, preserve unknown keys (forward-compat), then write.
- Retry contention: 3 attempts × 50 ms backoff → throws `StateLocked` (F-08 D-02 coalesces the print).
- Schema migrations in `src/state/migrate.ts`; `.bak` snapshot before each migration; recovery on partial failure per DBSCHEMA `## Migrations`.
- File-mode enforcement: `0600` on Unix (throws `Perms` if more permissive); Windows ACL set at *creation* via `fs.open` with explicit mode + post-open `icacls` shrink (D-02 — Node's `fs.open` does not accept Win32 `SECURITY_ATTRIBUTES` directly; mitigation is to create the file in a private parent directory and rely on inheritance).
- Platform config dirs per §7.4; `BAB_CONFIG_DIR` override via `process.env`.
- TOML library: `@iarna/toml` v3 for unknown-key + comment preservation (D-01).

### Out of Scope
- Conversation content — explicit non-goal (PRD §5.5.1).
- Provider-side session storage layout (`~/.claude/projects/`, etc.) — read by F-05, not owned here.
- Telemetry cache `~/.cache/bab/telemetry.jsonl` — owned by F-10 in the cache dir, not the config dir.
- Discovery probe logic — F-03 writes its results through this store but does not own the schema.
- Encryption-at-rest — DEF-01 (no credentials in this file by design).

## §3 Acceptance Criteria

> Each AC must be independently verifiable. Mark `[x]` when test passes.

- [ ] AC-01: Load — a well-formed `state.toml` with `schema_version = 1` parses into the in-memory `StateStore` object and returns all known fields plus any unknown top-level keys captured for round-trip.
- [ ] AC-02: First-run — when no `state.toml` exists, `StateStore.load()` creates the parent config dir (per §7.4) with mode `0700` (Unix) / user-only DACL (Windows) and writes a minimal v1 file with mode `0600`, returns an empty store.
- [ ] AC-03: Atomic write — every write: write `state.toml.tmp` → `fs.fsync(tmpFd)` → `fs.fsync(parentDirFd)` (Unix; Windows skips dir-fsync) → `fs.rename(tmp, state.toml)`. Killing the process between any two steps leaves `state.toml` either fully old or fully new — never empty, never partial.
- [ ] AC-04: Per-key merge under lock — with `state.toml.lock` held, the writer re-reads on-disk state, applies in-memory deltas key-by-key (not whole-file overwrite), writes the merge result. Concurrent REPL + one-shot: REPL sets `[sessions].claude = "A"`, one-shot sets `[sessions].codex = "B"`, both values present after both writes.
- [ ] AC-05: Lock contention — writer that cannot acquire `state.toml.lock` retries 3× at 50 ms, then throws `StateLocked`. Lockfile released on every code path (success, throw, process-exit), proven by a leak test running 100 sequential writes with one throwing writer.
- [ ] AC-06: Reader concurrency — `StateStore.load()` never acquires `state.toml.lock`. Holding the lock with a fixture, 10 concurrent readers all succeed in < 100 ms total.
- [ ] AC-07: Unknown-key preservation — a `state.toml` containing `[preferences].future_flag = "x"`, `[providers.claude].future_field = 7`, and a top-level `[experimental]` table round-trips unchanged after any write that touches a known key. Verified by content-equivalent reserialization of unknown subtrees.
- [ ] AC-08: Schema-version refuse-newer — loading a file whose `schema_version` exceeds the highest known version throws `StateSchema` with both numbers in the message and does not rewrite the file.
- [ ] AC-09: Schema migration round-trip — a v0 → v1 migration (placeholder; first real migration is the test fixture) copies the original to `state.toml.v0.bak`, writes the transformed file via tmp + rename, preserves unknown keys across the transform.
- [ ] AC-10: Migration partial-failure recovery — injected fault between rename and follow-up step: next `StateStore.load()` detects the `.bak`, restores it over `state.toml`, prints a one-line `⚠ migration rolled back from <bak>` warning. Lockfile is held across the restore.
- [ ] AC-11: Unix mode enforcement — loading a `state.toml` with mode `0640`, `0644`, `0660`, or `0777` throws `Perms` and does not parse or rewrite the file. Mode `0600` and `0400` load successfully. Skipped on Windows.
- [ ] AC-12: Windows DACL enforcement — on Windows, `state.toml` created by bab grants Full Control to the current user SID only; `BUILTIN\Users` and `Everyone` are absent. Verified via `icacls` parse. Implementation: file is created inside the bab config dir whose own DACL was set user-only at first-run via `mkdir` + `icacls /grant:r %USERNAME%:F /inheritance:r`; the file inherits.
- [ ] AC-13: Corruption surfaces clean error — truncated file, malformed TOML, missing `schema_version`, non-integer `schema_version` each throw `StateCorrupt` with the path in the message. No partial state exposed to callers.
- [ ] AC-14: Config-dir resolution — `BAB_CONFIG_DIR` overrides all platform defaults; absent, the resolver returns the §7.4 platform default. Tested with each env-var permutation.

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | Load (warm OS cache) ≤ 5 ms p95; load (cold) ≤ 15 ms p95; write incl. fsync ≤ 20 ms p95; lock acquisition (uncontended) ≤ 1 ms p95. |
| Error budget | `StateCorrupt` rate ≤ 0.01% of loads on healthy installs (telemetry-derived once F-10 ships); partial-migration auto-restore succeeds 100% on injected-fault tests. |
| Browser support | N/A |
| Quota enforcement | N/A |
| Accessibility | N/A — non-UI |
| Security | Mode `0600` on Unix (throw `Perms` if more permissive); Windows: file created inside a user-only-DACL parent dir (set at first-run via `icacls /grant:r <user>:F /inheritance:r`) — D-02; lockfile inherits same 0600 / user-only ACL; no credentials read or stored; unknown keys preserved on rewrite. Error-code mapping owned by [DBSCHEMA.md `## Error code mapping`](./DBSCHEMA.md). |
| Concurrency | Single writer at a time per config dir (cross-process lockfile via `proper-lockfile`); unlimited concurrent readers; per-key merge inside the write lock guarantees no writer's change is silently dropped. |
| Durability | After `save()` returns, the change survives a process kill or power loss — via `fs.fsync(tmpFd)` + `fs.fsync(parentDirFd)` (Unix) / `MoveFileEx` rename semantics (Windows) before rename. |
| Portability | Pure JS + one cross-platform native-ish dep (`proper-lockfile` — pure JS, no native binding). Runs on Node `^20.10 \|\| ^22 \|\| ^24` per PRD §7.4. |

## §5 Data Model

Schema lives in [DBSCHEMA.md](./DBSCHEMA.md) — single source of truth per INV-1.

## §6 Interface Contracts

> Not applicable — `Applies` does not include `interface-contracts`. The TypeScript API (`StateStore.load`, `StateStore.saveWithLock`, `StateStore.migrate`) is an internal seam consumed by F-03, F-05, F-07, F-10.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit (vitest) | Parse minimal v1 fixture | All known fields populated, unknown keys retained |
| TC-02 | Unit | Parse fixture with unknown keys at every level | Unknown subtrees survive round-trip write |
| TC-03 | Unit | Parse fixture missing `schema_version` | Throws `StateCorrupt` |
| TC-04 | Unit | Parse fixture with `schema_version = 999` | Throws `StateSchema`, file not rewritten |
| TC-05 | Unit | Parse truncated / malformed TOML | Throws `StateCorrupt` |
| TC-06 | Integration | First-run creates file with mode 0600 (Unix) | `fs.statSync(p).mode & 0o777 === 0o600`; file content parses |
| TC-07 | Integration (Windows) | First-run DACL contains only current-user SID | `icacls` output excludes Users / Everyone |
| TC-08 | Integration | Load with mode 0644 fixture | Throws `Perms` |
| TC-09 | Integration | Atomic-write crash injection between tmp-write and rename | `state.toml` still contains pre-write contents |
| TC-10 | Integration | Atomic-write crash injection between rename and fsync(dir) | Next load sees the new contents (rename completed) |
| TC-11 | Integration | 100 concurrent writers each set a unique `[sessions].<name>` key | After completion, all 100 values present; no leak past 3 retries |
| TC-12 | Integration | Reader during held write lock | Reader returns current on-disk state within 100 ms; never blocks |
| TC-13 | Integration | Lockfile leak test | After 100 sequential writes (incl. one throwing writer), no stale lockfile |
| TC-14 | Integration | Migration with unknown keys at every level | Round-trip preserves unknowns; `.bak` matches pre-migration byte-for-byte |
| TC-15 | Integration | Migration partial-failure injection | Next launch restores from `.bak`, prints warning, succeeds |
| TC-16 | Integration | `BAB_CONFIG_DIR` override | Reads / writes target the override path |
| TC-17 | Property (fast-check) | Random valid TOML + arbitrary unknown keys, write then re-read | Known fields equal; unknown keys equal |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-bab.md §6 — F-04; §5.2.1, §5.5, §7.4
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **DB Schema:** [DBSCHEMA.md](./DBSCHEMA.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** []

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | TOML library — `@iarna/toml` vs `smol-toml` vs `js-toml`? | backend-lead | Resolved (2026-05-23) | `@iarna/toml` v3 — unknown-key preservation + active maintenance per D-01. |
| Q-02 | Lockfile behavior on NFS / SMB where flock semantics are weak | backend-lead | Open | `proper-lockfile` uses `flock` + an mtime-based heuristic; detect non-local FS via `fs.statfs` (Node 18.15+) and surface one-line warning. Resolve by first GitHub issue reporting flock-on-NFS misbehavior, or v1+1 quarter. |
| Q-03 | Auto-delete `state.toml.v<old>.bak` after N launches? | db-architect | Open | Keep forever in v1 (cheap, aids debugging); add `bab state prune-backups` in v2. Resolve by v1 release. |
| Q-04 | Windows atomic-rename semantics (`MoveFileEx` open-handle blocking) | testing-lead | Open | TC-09/TC-10 must be re-validated on Windows; surface as known limitation if open handles block rename. |

## §10 Implementation Notes

- The per-key merge inside the write lock is the linchpin of the "REPL plus parallel one-shot" concurrency story (PRD §5.2.1). Whole-file overwrite would silently drop one writer's session ID.
- D-01 (`@iarna/toml`) is non-negotiable for AC-07: most other Node TOML libs lose unknown keys on serialize. `@iarna/toml` is the only widely-used one that preserves the full document tree including comments.
- D-02 (Windows ACL via parent-dir DACL inheritance) is a Node-shaped workaround: Node's `fs.open` doesn't accept Win32 `SECURITY_ATTRIBUTES`, so the canonical "set ACL at file creation" pattern isn't available. Mitigation: set the DACL on the bab config dir at first-run via `icacls /grant:r %USERNAME%:F /inheritance:r` (or the PowerShell `Set-Acl` equivalent), and rely on inheritance for new files inside. This is the supported Node idiom.
- D-03 (fsync parent dir) is required on Unix because POSIX rename ordering is not implied. On Windows, `fs.rename` calls `MoveFileEx` which has different durability semantics; the dir-fsync step is a no-op and that's fine.
- D-05 (lockfile staleness via `proper-lockfile`'s mtime heartbeat) avoids PID-reuse races that a manual stale-PID recovery would have. The package is purpose-built for this.
- Tooling note: `@iarna/toml` is pure JS, ~70 KB packed. `proper-lockfile` is pure JS, ~20 KB. Both well under the install-footprint budget (PRD G-06).
