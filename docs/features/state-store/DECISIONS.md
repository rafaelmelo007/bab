# Decisions — State Store

**Feature:** state-store
**Source:** /vskit:critique-spec state-store (2026-05-23, self-review via general-purpose agent playing backend-lead + db-architect + security-specialist + testing-lead + prompt-engineer lenses); Node.js retrofit 2026-05-23 after PRD §13 Q-06 flipped Rust → Node.js.
**Last updated:** 2026-05-23

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | backend-lead | TOML library (resolves Q-01) | `@iarna/toml` v3 | Unknown-key preservation (AC-07) requires keeping the original document tree. `@iarna/toml` is the only widely-used Node TOML lib that preserves the full tree including comments. `smol-toml` is faster but loses comments; `js-toml` (whichever variant) drops ordering. ~70 KB packed — fine under PRD G-06 install-footprint. | SPEC §9 Q-01 resolved; SPEC §10; DBSCHEMA `## Invariants` | — |
| D-02 | 2026-05-23 | security-specialist | Windows ACL application point | Set DACL on the bab config dir at first-run via `icacls /grant:r %USERNAME%:F /inheritance:r` (or PowerShell `Set-Acl` equivalent); new files inside inherit user-only DACL. | Node's `fs.open` does not accept Win32 `SECURITY_ATTRIBUTES`, so the canonical "set ACL at file creation" pattern from the original Rust draft isn't available. Parent-dir DACL + inheritance is the supported Node idiom and produces an equivalent end state (Users / Everyone absent). Verified by `icacls` post-creation in TC-07. | SPEC §4 Security; AC-12; DBSCHEMA `## Reserved sections` | — |
| D-03 | 2026-05-23 | backend-lead | fsync scope on Unix | fsync both the tmpfile (`fs.fsync(tmpFd)`) AND the parent directory (`fs.fsync(parentDirFd)`) before declaring the write durable. Windows skips dir-fsync (`MoveFileEx` provides its own durability). | Without parent-dir fsync, the rename can be lost on crash on POSIX (POSIX rename ordering not implied). On Windows, `fs.rename` calls `MoveFileEx` which handles directory metadata durability differently — no-op is correct. | SPEC §4 Durability; AC-03; TC-09/TC-10 | — |
| D-04 | 2026-05-23 | backend-lead | Reader lock policy | Readers never lock; mtime/etag mismatch between read and write surfaces a one-line warning, not an error. | PRD §5.2.1 mandates concurrent reads. Per-key merge under the write lock (AC-04) prevents data loss; reader-locks would only add latency. | SPEC §4 Concurrency; AC-06; TC-12 | — |
| D-05 | 2026-05-23 | security-specialist | Lockfile staleness handling | Use `proper-lockfile` npm package — pure JS, cross-platform (`flock` + mtime heartbeat on Unix, `fs.open` exclusive flag + heartbeat on Windows). bab never deletes a lockfile it didn't create. | The npm package is purpose-built for this — PID-based staleness recovery has known races (PID reuse); `proper-lockfile` uses a heartbeat-mtime approach instead. ~20 KB packed. | DBSCHEMA `## Lockfile contract`; AC-05; TC-13 | — |
| D-06 | 2026-05-23 | db-architect | `[sessions]` schema shape | Inline tables with `id` + `last_used` per provider (not bare strings) | PRD §4.9.1 `/sessions` LAST_USED column requires the timestamp; storing it here avoids a per-provider file-stat call on every `/sessions` invocation. Resolves PRD §5.5.2 sample vs §4.9.1 inconsistency in favor of timestamped storage. | DBSCHEMA `## Current schema`; PRD §5.5.2 sample (next promotion cycle) | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | Encryption-at-rest for `state.toml` | No credentials stored (G-08); session IDs are not secrets. Encryption would add a key-management problem with no threat-model win. | Any future feature stores actual credentials in state.toml |
| DEF-02 | Filesystem-watch invalidation (via `node:fs.watch`) | v1 reads are per-call; no long-lived in-memory cache to invalidate. v2 daemon (PRD §9) will need this. | Daemon design starts |
| DEF-03 | Multi-host config sync (cloud / dotfiles repo) | Out of v1 scope per PRD §5.5.4 | Post-v1 feedback |
| DEF-04 | Compression for `state.toml` | File expected < 10 KB; compression is install-footprint + complexity for no win | If a future feature pushes file > 1 MB |
