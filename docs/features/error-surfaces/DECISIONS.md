# Decisions — Error Surfaces

**Feature:** error-surfaces
**Source:** /vskit:critique-spec error-surfaces (2026-05-23, self-review via general-purpose agent playing security-specialist + ux-specialist + backend-lead + testing-lead + prompt-engineer lenses)
**Last updated:** 2026-05-23 (Node.js retrofit applied to D-04, D-07 implementation refs after PRD §13 Q-06 flipped Rust → Node.js)

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | testing-lead | Where does the v0 negative-test corpus come from given §3.1 has no real users yet? | Seed from author-machine: capture 60 days of stderr from `claude -p`, `codex exec`, `gemini -p`, `ollama` HTTP responses across ≥ 30 distinct prompts per provider; commit redacted snapshots to `tests/redact/corpus/<provider>/` with a `MANIFEST.md` recording collection date, provider version, prompt hash (not text). | No external corpus exists for these specific providers; founder-conviction §3.1 means author is the only available source. ≥ 200 lines is achievable from ~7 days of normal use. | SPEC §3 AC-22; SPEC §7 TC-07; SPEC §9 Q-01 (resolved) | — |
| D-02 | 2026-05-23 | backend-lead | Should `E-STATE-LOCKED` retries print each attempt or coalesce? | Coalesce: print once on first contention; print `E-STATE-LOCK-FAILED` only if all 3 attempts fail. | Per-attempt prints would spam stderr in normal REPL + one-shot co-use (PRD §5.2.1). | SPEC §3 AC-09 | — |
| D-03 | 2026-05-23 | security-specialist | Should `BAB_REDACT_EXTRA` patterns be OR'd against defaults or replace them? | OR'd (additive only). No way to disable default patterns. | Defaults are a security floor; allowing replacement gives a footgun (`BAB_REDACT_EXTRA=''` would silently disable redaction). | SPEC §3 AC-21; SPEC §4 Security NFR | — |
| D-04 | 2026-05-23 | ux-specialist | ANSI color palette — what SGR codes? | `✗` = SGR 31 (red); `⚠` = SGR 33 (yellow); code prefix (`E-CLI-CRASH:`) = SGR 1 (bold), no color. 8-color only. Implementation uses inline helper (no `chalk` dep) to stay under PRD G-06 install footprint. | Works on every terminal in PRD §7.3 compat matrix without probing terminfo. | SPEC §3 AC-14, AC-16; SPEC §10 | — |
| D-05 | 2026-05-23 | security-specialist | Does the redactor operate on subprocess stderr only or all stderr (including bab's own logs)? | All bab-emitted stderr is routed through the redactor (defense-in-depth). | Cheap; protects against future logging additions that forget to call the redactor. | SPEC §4 Security NFR | — |
| D-06 | 2026-05-23 | prompt-engineer | Should `Applies:` include `interface-contracts`? | Yes — `BabError` shape is a load-bearing contract for F-02/F-05/F-06/F-07. | Downstream features need to lock against the surface before F-08's full implementation lands; without an INTERFACE-CONTRACTS.md, the seam fragments. | SPEC frontmatter `Applies:`; SPEC §6 (link added); new file INTERFACE-CONTRACTS.md | — |
| D-07 | 2026-05-23 | backend-lead | Pattern-list versioning | `REDACT_VERSION` constant in `src/redact/index.ts`, bumped on every change; recorded in telemetry `error_<code>` event_data (version int only) per PRD §10.2 allowlist. | Enables correlating FPR regressions across releases without exposing patterns themselves. | SPEC §4 Security NFR; F-10 INTERFACE-CONTRACTS cross-ref | — |
| D-08 | 2026-05-23 | backend-lead | Error shape: discriminated-union vs class hierarchy | Class hierarchy (`abstract class BabError` + 13 concrete subclasses) — `error instanceof CliCrash` for caller dispatch; `.code: BabErrorCode` exposed for serialization (telemetry, exit-code lookup). Discriminated-union form also exported for callers that prefer pattern matching. | TypeScript classes give caller-side `instanceof` narrowing for free; `Error` superclass means `.stack` is captured for crash telemetry. Discriminated union adds a typed dispatch path for handlers that prefer `switch (e.code)`. | INTERFACE-CONTRACTS.md §1 | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | i18n / localized error messages | English-only v1 | Day-90 adoption review surfaces non-English-speaking install % via telemetry locale signal |
| DEF-02 | Structured (JSON) error output for `jq` piping | Not requested; exit codes cover the script use-case | First user request via GitHub issue |
| DEF-03 | Telemetry-side redaction (forwarding redactor to F-10) | F-10's allowlist (PRD §10.2) emits only `error_<code>` — no free text, so redaction is not in F-10's path | If F-10 ever adds free-text fields |
| DEF-04 | Crash-reporter symbolication | Out of scope; F-10 / PRD Q-09 owns it | F-10 implementation |
| DEF-05 | Redaction-pattern hot-reload | Pattern list is compile-time + env var; live reload is YAGNI | If users ship custom corpora |
