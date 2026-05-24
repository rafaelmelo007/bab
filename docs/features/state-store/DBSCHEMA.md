# DB Schema — State Store

**Feature:** state-store
**Source:** docs/prds/2026-05-23-ulm.md §5.2.1, §5.5.2, §5.5.4; /vskit:critique-spec state-store D-01..D-06 (2026-05-23, Node.js retrofit)
**Last updated:** 2026-05-23

> Single source of truth for `state.toml`. Schema, atomic-write contract, lockfile contract, and error-code mapping all live here per INV-1.

## §1 File layout

- **Path:** `$ULM_CONFIG_DIR/state.toml` if set; else platform default:
  - Linux: `$XDG_CONFIG_HOME/ulm/state.toml` (default `~/.config/ulm/state.toml`)
  - macOS: `~/Library/Application Support/ulm/state.toml`
  - Windows: `%APPDATA%\ulm\state.toml`
- **Mode:** `0600` Unix; user-only NTFS DACL on Windows (set on the *parent dir* at first-run via `icacls /grant:r %USERNAME%:F /inheritance:r` per D-02; new files inherit).
- **Lockfile:** sibling `state.toml.lock`, managed by `proper-lockfile` (D-05), inherits 0600 / user-only DACL.
- **Migration backup:** `state.toml.v<old>.bak`.

## §2 Current schema (`schema_version = 1`)

```toml
schema_version = 1

[preferences]
default_provider = "claude"
default_models = { claude = "claude-opus-4-7", gemini = "gemini-2.0-pro" }
# Inline table — unknown keys preserved on write (@iarna/toml, per D-01).

[sessions]
claude = { id = "abc-123-def", last_used = "2026-05-23T14:02:11Z" }
codex  = { id = "xyz-789-uvw", last_used = "2026-05-23T13:55:02Z" }
gemini = { id = "ghi-456-jkl", last_used = "2026-05-22T09:11:48Z" }
ollama = { id = "",            last_used = "" }   # stateless via HTTP

[providers.claude]
absolute_path = "/usr/local/bin/claude"   # canonicalized via fs.realpath (F-03 D-04)
version       = "1.4.2"
transport     = "acp"            # one of: "acp", "exec", "http"
sha256        = "..."            # informational binary fingerprint (PRD §5.4)
detected_at   = "2026-05-23T14:02:11Z"
# One [providers.<name>] block per detected provider; absent block ⇒ not detected.
```

## §3 Reserved sections

The following top-level tables are reserved for future features and MUST be preserved by the unknown-key round-trip rule even though F-04 does not populate them:

- `[telemetry]` — owned by F-10 (keys `enabled`, `anon_id`, `mode`). May appear in v1 files written by F-10; never written by F-04. Tri-state `mode` per F-10 D-08.
- `[experimental]` — sandbox for unstable flags. Always round-tripped, never validated.

## §4 Invariants

- `schema_version` is the first key in the file and MUST be a positive integer literal; floats, strings, and negatives throw `StateCorrupt`.
- Unknown top-level keys and unknown keys inside `[preferences]` / `[providers.*]` / reserved sections are preserved on rewrite (forward-compat, via `@iarna/toml` per D-01).
- Reads never lock (D-04); writes always acquire `state.toml.lock` (via `proper-lockfile` per D-05) before tmp-write + `fsync(tmpFd)` + `fsync(parentDirFd)` (Unix) + `fs.rename`.
- Inside the write lock: re-read on-disk state, merge per-key, then write — never whole-file overwrite (linchpin of REPL + one-shot concurrency per PRD §5.2.1).
- Mode check on every load: more permissive than 0600 on Unix ⇒ throws `Perms`, refuses to load.
- Lockfile is created with the same 0600 / user-only ACL as `state.toml` (inherited from parent dir on Windows).
- Migration `.bak` files inherit the source file's mode.

## §5 Lockfile contract

- Implementation: `proper-lockfile` npm package (D-05) — pure JS, cross-platform.
- Path: sibling `state.toml.lock`, created by `proper-lockfile.lock(file)`.
- Unix: backed by `flock(LOCK_EX | LOCK_NB)` with periodic mtime heartbeat to detect crashed holders.
- Windows: backed by `fs.open(O_CREAT | O_EXCL)` with same heartbeat.
- Lockfile content: heartbeat timestamp (managed by `proper-lockfile`, not ulm).
- Stale lockfile recovery: `proper-lockfile`'s heartbeat-stale threshold (default 5 s) handles crashed holders; ulm never deletes a lockfile it didn't create.
- Retry: 3 attempts × 50 ms backoff via `proper-lockfile.lock(file, { retries: { retries: 3, minTimeout: 50, maxTimeout: 50 } })` → throws `StateLocked`.

## §6 Migrations

| From → To | Trigger | Owner | Backup name | Notes |
|-----------|---------|-------|-------------|-------|
| (none yet; v1 ships at `schema_version = 1`) | — | backend-lead | — | — |

**Migration procedure (every row):**
1. Acquire `state.toml.lock` via `proper-lockfile.lock()`.
2. Copy `state.toml` → `state.toml.v<old>.bak` (`fs.copyFile` + `fs.fsync`).
3. Write transformed content to `state.toml.tmp` via `fs.writeFile`, then `fs.fsync(tmpFd)`.
4. `fs.rename(tmp, 'state.toml')`; `fs.fsync(parentDirFd)` on Unix.
5. Release lock. Leave `.bak` in place; user/operator removes manually (or `ulm state prune-backups` in v2 per Q-03).

**Partial-failure recovery on next launch:**
- `.bak` exists AND `state.toml` parses as the OLD schema → migration crashed pre-rename; delete `.bak`, retry migration.
- `.bak` exists AND `state.toml` parses as the NEW schema → migration succeeded; `.bak` is informational, leave alone.
- `state.toml` does not parse → restore from `.bak`, throw `StateCorrupt` with both paths in the message.

## §7 Error code mapping

| Condition | Error class (F-08) |
|-----------|--------------------|
| File mode > 0600 on Unix | `Perms` |
| Parse failure / truncated / missing schema_version / non-integer schema_version | `StateCorrupt` |
| `schema_version` > MAX_KNOWN | `StateSchema` |
| Lock acquisition failed after 3 retries | `StateLocked` |

All thrown via F-08's `UlmError` hierarchy — see [F-08 INTERFACE-CONTRACTS.md](../error-surfaces/INTERFACE-CONTRACTS.md) §1.

## §8 Consumer features

- **F-03 `provider-discovery`** writes `[providers.<name>]` blocks; per-key merge preserves a concurrent one-shot's `[sessions]` writes.
- **F-05 `session-management`** writes `[sessions].<provider>` via the per-key API.
- **F-07 `one-shot-mode`** reads on entry, may write `[sessions]` — relies on the merge guarantee (F-07 §10).
- **F-10 `telemetry-opt-in`** writes `[telemetry]` block (reserved here).
