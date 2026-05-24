# Tasks — State Store

**Feature:** state-store
**Source:** SPEC.md (14 ACs), DECISIONS.md (D-01..D-06), DBSCHEMA.md
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Scaffold `src/state/index.ts` exporting `StateStore` class with `load()`, `saveWithLock(callback)`, `migrate()` API | backend-lead | High | Done | AC-01, AC-02 | — |
| T-02 | Add `@iarna/toml` (^3) and `proper-lockfile` (^4) deps to package.json | backend-lead | High | Done | AC-01 | D-01, D-05 |
| T-03 | Implement TOML parse via `@iarna/toml.parse()`; preserve original document tree for round-trip via `toml.stringify` | backend-lead | High | Done | AC-01, AC-07 | D-01 |
| T-04 | Implement config-dir resolver: `ULM_CONFIG_DIR` → `$XDG_CONFIG_HOME/ulm` (Linux) → `~/Library/Application Support/ulm` (macOS) → `%APPDATA%\ulm` (Windows) | backend-lead | High | Done | AC-14 | — |
| T-05 | Implement first-run: create parent dir with mode 0700 (Unix) / icacls user-only (Windows); write minimal v1 file with mode 0600 | security-specialist | High | Done | AC-02, AC-12 | D-02 |
| T-06 | Implement atomic write: `fs.writeFile(tmp)` → `fs.fsync(tmpFd)` → `fs.fsync(parentDirFd)` (Unix only) → `fs.rename(tmp, final)` | backend-lead | High | Done | AC-03 | D-03 |
| T-07 | Implement per-key merge inside `saveWithLock`: re-read on-disk state, apply caller delta via callback, then write merged tree | backend-lead | High | Done | AC-04 | — |
| T-08 | Wire `proper-lockfile.lock(file, { retries: { retries: 3, minTimeout: 50, maxTimeout: 50 } })` for writers; readers never lock | backend-lead | High | Done | AC-05, AC-06 | D-04, D-05 |
| T-09 | Implement Unix mode-0600 check on every load: read `fs.statSync(p).mode & 0o777`; throw F-08 `Perms` if more permissive | security-specialist | High | Done | AC-11 | — |
| T-10 | Implement Windows DACL setup: at first-run create config dir with `icacls /grant:r %USERNAME%:F /inheritance:r` (or PowerShell `Set-Acl` equivalent); new files inherit | security-specialist | High | Done | AC-12 | D-02 |
| T-11 | Implement schema-version refuse-newer: if `schema_version` > MAX_KNOWN, throw F-08 `StateSchema` (do not rewrite) | backend-lead | High | Done | AC-08 | — |
| T-12 | Implement corruption detection: TOML parse failure / truncated / missing schema_version / non-integer schema_version → throw F-08 `StateCorrupt` with path | backend-lead | High | Done | AC-13 | — |
| T-13 | Scaffold `src/state/migrate.ts` with empty migration table (v1 has no migrations yet); document the migration procedure per DBSCHEMA §6 | db-architect | Medium | Done | AC-09 | — |
| T-14 | Implement migration partial-failure recovery: on launch, detect `.bak` + parse OLD-schema; restore from `.bak`, print `⚠ migration rolled back` warning, hold lock during restore | db-architect | Medium | Done | AC-10 | — |
| T-15 | Implement reserved-section preservation: `[telemetry]`, `[experimental]`, and unknown top-level keys round-trip on rewrite | db-architect | High | Done | AC-07 | — |
| T-16 | Implement `[sessions]` inline-table schema with `id` + `last_used` per provider (not bare strings) per D-06 | db-architect | High | Done | AC-04 (indirectly) | D-06 |
| T-17 | Write vitest unit test parsing minimal v1 fixture; assert known fields populated, unknown keys retained | testing-lead | Medium | Done | TC-01 | — |
| T-18 | Write vitest test parsing fixture with unknown keys at every level; round-trip preserves them | testing-lead | Medium | Done | TC-02, AC-07 | — |
| T-19 | Write vitest tests for `StateCorrupt` (TC-03/TC-05) and `StateSchema` (TC-04) error paths | testing-lead | Medium | Done | TC-03, TC-04, TC-05 | — |
| T-20 | Write integration test asserting Unix mode 0600 on first-run; refuse-load on 0644 fixture | testing-lead | Medium | Done | TC-06, TC-08 | — |
| T-21 | Write Windows DACL integration test: `icacls` output excludes Users / Everyone after first-run | testing-lead | Medium | Done | TC-07 | D-02 |
| T-22 | Write crash-injection integration test (fault between tmp-write and rename) — `state.toml` still contains pre-write contents | testing-lead | High | Done | TC-09 | D-03 |
| T-23 | Write crash-injection integration test (fault between rename and fsync(dir)) — next load sees new contents | testing-lead | High | Done | TC-10 | D-03 |
| T-24 | Write 100-concurrent-writers integration test setting unique `[sessions].<name>` keys; assert all 100 present, no leak past 3 retries | testing-lead | High | Done | TC-11, AC-04, AC-05 | — |
| T-25 | Write reader-concurrency integration test: 10 readers during held lock all succeed in < 100 ms | testing-lead | Medium | Done | TC-12 | D-04 |
| T-26 | Write lockfile leak test: 100 sequential writes (incl. one throwing writer) leave no stale lockfile | testing-lead | High | Done | TC-13, AC-05 | D-05 |
| T-27 | Write migration partial-failure injection test: next launch restores from `.bak`, prints warning, succeeds | testing-lead | Medium | Done | TC-15, AC-10 | — |
| T-28 | Write fast-check property test: random valid TOML + arbitrary unknown keys, write then re-read — known fields equal, unknown keys equal | testing-lead | Medium | Done | TC-17 | — |
| T-29 | Write integration test for `ULM_CONFIG_DIR` env override across all three platforms | testing-lead | Low | Done | TC-16 | — |
| T-30 | Implement reader-write mtime/etag mismatch warning (one-line stderr, not an error) per D-04 | backend-lead | Low | Done | — | D-04 |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
