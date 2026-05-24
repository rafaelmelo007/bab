# Interface Contracts — Telemetry Opt-In

**Feature:** telemetry-opt-in
**Source:** docs/prds/2026-05-23-ulm.md §10.2, §10.3; /vskit:critique-spec D-01..D-09 (2026-05-23, Node.js retrofit)
**Last updated:** 2026-05-23

> Single source of truth for the telemetry endpoint payload, local-cache format, state.toml `[telemetry]` block ownership boundary, and the verbatim user-facing disclosure text. Per INV-1, none of these live elsewhere.

## §1 Endpoint

- **URL:** `https://telemetry.ulm.<TBD per PRD Q-08>/v1/event`
- **Build-time constant** in `src/telemetry/endpoint.ts`:
  ```ts
  export const TELEMETRY_URL: `https://${string}` = "https://telemetry.ulm.example/v1/event";
  ```
  TypeScript narrow type prevents accidental `http://`. Per D-04, no runtime override (anti-exfiltration).
- **Method:** `POST`
- **Auth:** none (anonymous)
- **Transport:** HTTPS-only; TLS 1.2+; cert-chain validation enforced (Node `fetch` default).
- **Body:** single JSON object per event (see §3 below).
- **Request headers:** `Content-Type: application/json`, `User-Agent: ulm/<version>`. No cookies, no `Authorization`, no custom auth headers ever.
- **Request body byte cap:** 4 KB. Larger events refused at serialization time (defensive — current allowlist cannot exceed this).
- **Response:** `204 No Content` on success; any non-2xx ⇒ event re-queued to local cache.

## §2 Per-event timing

- **Emit:** non-blocking — pushed to async queue, returns ≤ 1 ms p95 (AC-11).
- **Retry per event (D-02):** 3 attempts at 250 ms / 1 s / 4 s; after 3rd failure → park in cache.
- **Drain loop:** wakes on cache non-empty + endpoint reachable (HEAD probe every 5 min when cache non-empty). FIFO drain. SLO ≥ 95% within 24 h of reachability restoration (§10.3).
- **Clock-skew tolerance:** events with `timestamp` more than 7 days behind server-side now are still accepted (clients may have been offline). No upper-bound skew check on the client; server may reject future timestamps.

## §3 Event payload schema

```ts
type Event = {
  timestamp:   string;   // RFC3339 UTC ms precision, regex /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
  anon_id:     string;   // 32-char lowercase hex, regex /^[0-9a-f]{32}$/
  os:          "linux" | "macos" | "windows";  // FreeBSD/etc → "linux" per D-05
  ulm_version: string;   // semver, regex /^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/
  event_name:  AllowedEventName;
  event_data:  AllowedEventData[AllowedEventName];  // per-event allowlist below
};
```

## §4 Allowed event names + per-event `event_data` allowlist

| event_name | allowed `event_data` keys | values |
|------------|--------------------------|--------|
| `install` | (empty object `{}`) | — |
| `run_start` | `discovery_ms` (number) | wall-clock ms for first-run discovery |
| `provider_set` | `provider` (string) | one of `claude`, `codex`, `gemini`, `ollama` |
| `turn_complete` | `provider`, `transport`, `status`, `overhead_ms` | `transport` ∈ `acp \| exec \| http`; `status` ∈ `ok \| error \| cancelled`; `overhead_ms` number |
| `error_<CODE>` | `redact_version` (number) | `<CODE>` is one of the §4.8 codes per §5 below; `redact_version` is F-08 `REDACT_VERSION` constant (D-07 in F-08) |
| `crash` | (empty object `{}`) | — |

**Forbidden everywhere:** prompt content, conversation content, session IDs, file paths, env-var values, PII of any kind. Negative corpus in `tests/telemetry/forbidden_corpus/` gates against any of these appearing in serialized output (AC-10).

## §5 `error_*` event names (Q-03 / D-09 — underscores)

Hyphens in §4.8 codes converted to underscores on emit (per D-09):

`error_CLI_MISSING`, `error_CLI_UNAUTH`, `error_CLI_CRASH`, `error_CLI_TIMEOUT`, `error_ACP_PROTOCOL`, `error_HTTP_TIMEOUT`, `error_INVALID_PROVIDER`, `error_NO_PROVIDER`, `error_STATE_LOCKED`, `error_STATE_CORRUPT`, `error_STATE_SCHEMA`, `error_PROVIDER_VERSION`, `error_PERMS`, `error_CLI_NO_PROMPT`, `error_CLI_INVALID_UTF8`.

## §6 Local-cache file format

- **Path:** `$ULM_CACHE_DIR/telemetry.jsonl` (default: `~/.cache/ulm/telemetry.jsonl`, platform equivalents per §7.4).
- **Format:** newline-delimited JSON; one event object per line, same schema as the POST body.
- **Lifecycle:** append on emit; drained by background sender on next successful POST. Drain SLO: ≥ 95% drained within 24 h of network availability (§10.3).
- **Cap:** 5 MB FIFO trim, oldest events first (D-03).
- **Permissions:** mode `0600` Unix; inside user-only-DACL config dir on Windows.
- **Local-only mode (`ulm telemetry local`):** events written here only; never transmitted.

## §7 state.toml additions (owned by F-04 reserved section)

```toml
[telemetry]
enabled = true                                  # set by `ulm telemetry enable`
anon_id = "0123456789abcdef0123456789abcdef"    # 128-bit hex; regenerated on `ulm reset` (D-07 zero-overwrite)
mode    = "remote"                              # "remote" | "local" | "off" (D-08 tri-state)
```

**Ownership boundary:** F-04 owns the section's existence and the unknown-key preservation rule (F-04 DBSCHEMA §3 reserved sections). F-10 reads/writes only `enabled`, `anon_id`, `mode`. F-04's per-key merge (PRD §5.2.1) preserves these across concurrent writers.

## §8 Kill switches

- `ULM_NO_TELEMETRY=1` env var (any non-empty value other than `0`/`false`) — overrides everything: no events emitted, no local cache touched, no sockets opened.
- `ulm telemetry disable` — purges cache, sets `enabled = false`, sets `mode = "off"`, zeroes `anon_id` (D-07).

## §9 User-facing disclosure

Verbatim text printed by `ulm telemetry enable` before the confirmation prompt (source of truth: `tests/telemetry/enable_output.txt`; reproduced here for documentation parity, fixture is authoritative):

```
ulm telemetry is OPT-IN and OFF BY DEFAULT.

If you opt in, ulm will send anonymous events to:
  https://telemetry.ulm.<endpoint>/v1/event

These events ARE sent:
  - install         (first-run signal)
  - run_start       (process started, discovery latency)
  - provider_set    (which provider, no prompt content)
  - turn_complete   (provider + transport + ok/error/cancelled + ulm overhead ms)
  - error_<CODE>    (one of the documented error codes)
  - crash           (process crashed signal, no stack trace in v1)

These are NEVER sent:
  - prompt content        (anything you type)
  - conversation content  (anything providers send back)
  - session IDs           (provider session UUIDs)
  - file paths            (no /home/... or C:\... ever)
  - env var values        (no API keys, no tokens, no secrets)

A random 128-bit ID identifies your installation; rotate with: ulm reset

You can stop telemetry at any time with: ulm telemetry disable
You can override config with the env var: ULM_NO_TELEMETRY=1

To continue and enable telemetry, type 'yes' below.
Anything else cancels.

Enable ulm telemetry? [yes/no]:
```
