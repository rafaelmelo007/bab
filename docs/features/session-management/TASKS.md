# Tasks — Session Management

**Feature:** session-management
**Source:** SPEC.md (13 ACs), DECISIONS.md (D-01..D-08)
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Scaffold `src/sessions/index.ts` exporting `sessionNew(ctx)`, `sessionList(ctx)`, `sessionResume(ctx, args)` handlers (registered in F-06 dispatch table) | backend-lead | High | Done | AC-06, AC-08, AC-09 | D-04 |
| T-02 | Implement `sessionNew` via F-04 `stateStore.save(state => state.sessions[provider].id = "")` per-key callback (D-04 sets empty string, not delete) | backend-lead | High | Done | AC-09 | D-04 |
| T-03 | Implement `sessionList` (`/sessions`): enumerate provider's on-disk store, build column-formatted output per PRD §4.9.1 | backend-lead | High | Done | AC-01, AC-03 | — |
| T-04 | Implement ID truncation (12 chars + `…` at position 11) and PREVIEW truncation (40 chars + `…` at position 39) | ux-specialist | High | Done | AC-02 | D-01 |
| T-05 | Implement `LAST_USED` derivation from file mtime (`fs.statSync(file).mtime.toISOString()`), formatted RFC 3339 zulu | backend-lead | High | Done | AC-02 | D-02 |
| T-06 | Implement PREVIEW derivation: read first user message via `fileHandle.read({ length: 4096 })` (bounded buffer per §4 Security) — first 40 NFC-normalized code points | backend-lead | High | Done | AC-13 | D-03 |
| T-07 | Implement preview cache at `$ULM_CACHE_DIR/preview/<provider>/<id>` keyed by session-file mtime; LRU evict beyond 1000 entries | backend-lead | Medium | Done | (NFR Latency cold-cache) | D-03, D-06 |
| T-08 | Implement empty-list message: `No saved sessions for provider '<X>'.` (verbatim with period) | ux-specialist | High | Done | AC-03 | — |
| T-09 | Implement missing/unreadable provider store handling: empty-list + one-line `⚠` stderr warning (D-08); never throw | backend-lead | High | Done | AC-04 | D-07, D-08 |
| T-10 | Implement `sessionResume(ctx, args)`: validate `<id>` exists in provider's store; if yes, save via F-04 per-key API; if not, print `✗ unknown session id '<id>' for provider '<X>'.` and DO NOT mutate state | backend-lead | High | Done | AC-06, AC-07 | D-05 |
| T-11 | Implement `sessionResume` no-arg case: `✗ /resume requires a session id. See /sessions.` | backend-lead | Medium | Done | AC-08 | — |
| T-12 | Implement `NoProvider` pre-check for all three commands when no provider set | backend-lead | High | Done | AC-10 | — |
| T-13 | Implement non-UTF-8 byte tolerance in preview: `TextDecoder('utf-8', { fatal: false })` replaces with U+FFFD; never throw | backend-lead | Medium | Done | (NFR Compatibility) | — |
| T-14 | Implement timestamp parse-failure fallback to file mtime | backend-lead | Low | Done | (NFR Compatibility) | — |
| T-15 | Wire `--resume <id>` flag passthrough to F-02 transport on next turn after `sessionResume` succeeds (or absence after `sessionNew`) | backend-lead | High | Done | AC-06, AC-09 | — |
| T-16 | Write vitest snapshot test for 20-fake-sessions rendering (sorted, mixed-length IDs/previews) per §4.9.1 | testing-lead | High | Done | TC-01 | — |
| T-17 | Write vitest unit test for truncation at code-point positions 11 and 39 (long ID + long preview) | testing-lead | High | Done | TC-02 | D-01 |
| T-18 | Write vitest test for empty provider store → exact empty-list message | testing-lead | Medium | Done | TC-03 | — |
| T-19 | Write vitest test for missing provider-store path → empty message + `⚠` warning on stderr; no throw | testing-lead | High | Done | TC-04 | D-07, D-08 |
| T-20 | Write vitest test for ASCII fallback (`LANG=C`): `…` → `...`; `⚠` → `[!]` | testing-lead | Medium | Done | TC-05 | — |
| T-21 | Write integration test for `/resume <known-id>` → F-02 invoked with `--resume`; state.toml updated atomically | testing-lead | High | Done | TC-06 | — |
| T-22 | Write integration test for `/resume <unknown-id>` → error printed; state.toml mtime unchanged | testing-lead | High | Done | TC-07 | D-05 |
| T-23 | Write integration test for `/resume` no-arg → error, state.toml mtime unchanged | testing-lead | Medium | Done | TC-08 | — |
| T-24 | Write integration test for `/new` then send prompt → F-02 invoked WITHOUT `--resume`, `[sessions].<provider>.id === ""` | testing-lead | High | Done | TC-09 | D-04 |
| T-25 | Write integration test for cross-provider non-leakage: `/provider claude`, `/sessions`, `/provider gemini`, `/sessions` → disjoint result sets | testing-lead | High | Done | TC-10 | — |
| T-26 | Author tinybench `/sessions` benchmark: 20-row hot-FS p95 ≤ 100 ms over 1000 invocations | perf-specialist | High | Done | TC-11, AC-05 | — |
| T-27 | Author tinybench cold-cache `/sessions` benchmark: 20-row p95 ≤ 250 ms | perf-specialist | Medium | Done | TC-12 | — |
| T-28 | Write read-only contract test: `fs.statSync` mtime snapshot of provider-store dir before/after `/sessions` and `/resume` — identical | testing-lead | High | Done | TC-13, AC-12 | — |
| T-29 | Write conversation-content non-leakage test: byte-count assertion that `fileHandle.read` calls bounded to 4096 bytes per session file; snapshot of ulm stdout contains zero strings beyond the preview slice | security-specialist | High | Done | TC-14, AC-13 | — |
| T-30 | Write concurrent test (vitest concurrent): parallel REPL `/resume` + one-shot `/new` converge through F-04 per-key merge; final state.toml well-formed | testing-lead | High | Done | TC-15 | — |
| T-31 | Write vitest unit test for non-UTF-8 preview bytes → U+FFFD; no throw | testing-lead | Low | Done | TC-16 | — |
| T-32 | Write vitest unit test for timestamp parse failure → mtime fallback | testing-lead | Low | Done | TC-17 | — |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.

> **DEF-01 (provider-specific session-store path discovery):** TASKS for per-provider readers (claude `~/.claude/projects/`, codex TBD, gemini TBD) are blocked on PRE-03 + each provider's on-disk layout reverse-engineering. Add task rows once PRE-03 closes.
