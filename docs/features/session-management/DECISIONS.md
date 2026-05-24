# Decisions — Session Management

**Feature:** session-management
**Source:** /vskit:critique-spec session-management (2026-05-23, self-review via general-purpose agent playing backend-lead + ux-specialist + testing-lead + prompt-engineer lenses); Node.js retrofit 2026-05-23 after PRD §13 Q-06 flipped Rust → Node.js.
**Last updated:** 2026-05-23

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | backend-lead | What is the unit of "ID" for the 12-char column — full UUID or short prefix? | Truncated short prefix (first 11 chars + `…` if longer; full ID accepted by `/resume`) | Full Claude session IDs are 36-char UUIDs; rendering them blows the column. `/resume` matches against the full ID stored on disk so prefix is display-only. | SPEC §3 AC-02; SPEC §4 Accessibility | — |
| D-02 | 2026-05-23 | backend-lead | How is `LAST_USED` derived? | File mtime of the session file under each provider's store (`fs.statSync(file).mtime.toISOString()`), formatted RFC 3339 zulu | Most reliable cross-provider signal; provider session-file formats are not standardized for "last used". | SPEC §10; AC-01 | — |
| D-03 | 2026-05-23 | backend-lead | How is `PREVIEW` derived? | First user-message turn of the session file, first 40 code points after Unicode normalization (NFC); cached in `$BAB_CACHE_DIR/preview/<provider>/<id>` keyed by session-file mtime | Avoids re-parsing on every `/sessions` call; keeps the 100 ms p95 budget. Read via `fileHandle.read({ length: 4096 })` — bounded buffer per §4 Security. | SPEC §10; AC-05; TC-11 | — |
| D-04 | 2026-05-23 | testing-lead | Does `/new` delete the key or set empty string? | Set to empty string (`""`) | §5.5.2 example shows `ollama = ""`; the schema is fixed-shape per §5.2.1 — keys are preserved on rewrite | AC-09; SPEC §5 cross-ref to F-04 | — |
| D-05 | 2026-05-23 | backend-lead | What does `/resume <id>` do if `<id>` does not exist in the provider's store? | Reject with `✗ unknown session id ...`; do not mutate state | A successful write here would push the user into a broken next turn (provider errors on resume); fail loud (Q-05 spirit) | AC-07; TC-07 | — |
| D-06 | 2026-05-23 | backend-lead | Stale-cache policy for the PREVIEW cache | Invalidate when session-file mtime changes; LRU-evict cache directory beyond 1000 entries | Bounded disk use; matches §10 implementation note | NFR Latency cold-cache row | — |
| D-07 | 2026-05-23 | backend-lead | Behavior when a provider's store layout has changed (PRE-03 surfaces breakage) | One-line `⚠ provider 'X' session store unreadable (layout may have changed); update bab` warning on stderr; `/sessions` shows empty; `/resume` rejects with the same warning | Avoids fabricating sessions; PRE-03 contract says we break visibly when layout drifts | AC-04; DEF-01 | — |
| D-08 | 2026-05-23 | ux-specialist | Output stream for the `⚠` warning lines | stderr; the `No saved sessions...` line stays on stdout | Keeps `bab \| grep ...` clean for scripting; aligns with §4.7 streaming behavior (stderr buffered) | AC-04 | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | Provider-specific session-store path discovery + parse format (claude: `~/.claude/projects/`; codex: TBD; gemini: TBD) | Each CLI's on-disk layout is an undocumented internal contract — must be reverse-engineered per provider. Scope is too large for the critique and blocked by PRE-03 outcome | PRE-03 closes; or the first provider-specific session-management TASK begins |
| DEF-02 | Cross-shell session enumeration (when v2 daemon owns the store) | §9 daemon path is v2; v1 reads from disk only | v2 daemon work begins |
| DEF-03 | `/pipe` cross-provider context transfer | §5.5.3 explicit non-goal; §15 v2 candidate | v2 planning |
