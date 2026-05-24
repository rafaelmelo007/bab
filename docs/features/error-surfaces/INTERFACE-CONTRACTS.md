# Interface Contracts — Error Surfaces

**Feature:** error-surfaces
**Source:** docs/prds/2026-05-23-ulm.md §4.8 (error catalog), §7.2 (redaction); /vskit:critique-spec D-06 (2026-05-23)
**Last updated:** 2026-05-23

> The `UlmError` class hierarchy is the single source of truth for failure surfacing across ulm. Downstream features (F-02, F-05, F-06, F-07) depend on this shape and the §4.8 message templates. Changes here propagate to those features via `/vskit:critique-spec`.

## §1 `UlmError` TypeScript shape

```ts
// src/errors/index.ts

export type UlmErrorCode =
  | "E-CLI-MISSING"
  | "E-CLI-UNAUTH"
  | "E-CLI-CRASH"
  | "E-CLI-TIMEOUT"
  | "E-ACP-PROTOCOL"
  | "E-HTTP-TIMEOUT"
  | "E-INVALID-PROVIDER"
  | "E-NO-PROVIDER"
  | "E-STATE-LOCKED"
  | "E-STATE-CORRUPT"
  | "E-STATE-SCHEMA"
  | "E-PROVIDER-VERSION"
  | "E-PERMS"
  | "E-CLI-NO-PROMPT"      // F-07 D-02 add (PRD §4.8 amended on next promotion)
  | "E-CLI-INVALID-UTF8";  // F-07 D-02 add

export interface RenderOpts {
  color: boolean;     // resolved from NO_COLOR / --no-color / isTTY / FORCE_COLOR
  unicode: boolean;   // resolved from LANG / LC_ALL / Windows legacy console probe
}

export abstract class UlmError extends Error {
  abstract readonly code: UlmErrorCode;
  abstract readonly isWarning: boolean;     // true only for ProviderVersion
  abstract exitCode(): number;              // per §3 below
  abstract format(opts: RenderOpts): string;  // §4.8 templates
}

export class CliMissing      extends UlmError { constructor(public provider: string, public docUrl: string) { super(); /* … */ } /* code = "E-CLI-MISSING" */ }
export class CliUnauth       extends UlmError { constructor(public provider: string) { super(); } }
export class CliCrash        extends UlmError { constructor(public provider: string, public exit: number) { super(); } }
export class CliTimeout      extends UlmError { constructor(public provider: string, public seconds: number) { super(); } }
export class AcpProtocol     extends UlmError { constructor(public provider: string, public detail: string) { super(); } }
export class HttpTimeout     extends UlmError {}
export class InvalidProvider extends UlmError { constructor(public name: string) { super(); } }
export class NoProvider      extends UlmError {}
export class StateLocked     extends UlmError {}
export class StateCorrupt    extends UlmError { constructor(public path: string) { super(); } }
export class StateSchema     extends UlmError { constructor(public found: number, public supported: number) { super(); } }
export class ProviderVersion extends UlmError { constructor(public provider: string, public found: string, public minimum: string) { super(); } /* isWarning = true */ }
export class Perms           extends UlmError { constructor(public path: string) { super(); } }
export class CliNoPrompt     extends UlmError { constructor(public detail: "no_arg" | "empty_stdin") { super(); } }
export class CliInvalidUtf8  extends UlmError { constructor(public byteOffset: number) { super(); } }
```

Discriminated-union variant (alternative for callers that prefer pattern matching over `instanceof`):

```ts
export type UlmErrorUnion =
  | { code: "E-CLI-MISSING"; provider: string; docUrl: string }
  | { code: "E-CLI-UNAUTH"; provider: string }
  | /* … */ ;
```

## §2 Message templates (verbatim from PRD §4.8)

| Variant | Template (placeholders in `<…>`) | Glyph |
|---------|----------------------------------|-------|
| `CliMissing` | `provider 'X': not installed. Install: <doc URL>` | ✗ |
| `CliUnauth` | `provider 'X' not authenticated. Run: X login` | ✗ |
| `CliCrash` | `provider 'X' crashed (exit N). Output above may be partial.` | ✗ |
| `CliTimeout` | `provider 'X' timed out after Ns. Set ULM_TURN_TIMEOUT to extend.` | ✗ |
| `AcpProtocol` | `provider 'X' ACP error: <detail>. Falling back to exec mode this turn.` | ✗ |
| `HttpTimeout` | `ollama timeout after 30s. Is the daemon running?` | ✗ |
| `InvalidProvider` | `unknown provider 'foo'. Valid: claude, codex, gemini, ollama` | ✗ |
| `NoProvider` | `no provider selected. Run: /provider <name>` | ✗ |
| `StateLocked` | `another ulm process is writing state. Retrying...` (coalesced per D-02) | ✗ |
| `StateCorrupt` | `<path> is corrupt. Move it aside and re-run.` | ✗ |
| `StateSchema` | `state.toml is from a newer ulm (vN, this is vM). Upgrade ulm or use ULM_CONFIG_DIR.` | ✗ |
| `ProviderVersion` | `provider 'X' is vN, minimum vM. Some features may not work.` | ⚠ |
| `Perms` | `state.toml has insecure permissions. Run: chmod 0600 <path>` | ✗ |
| `CliNoPrompt` (F-07 D-02) | `no prompt provided. …` / `stdin is empty.` | ✗ |
| `CliInvalidUtf8` (F-07 D-02) | `stdin contains invalid UTF-8 at byte N. …` | ✗ |

**Rendered form (TTY + UTF-8 + color):** `<glyph_sgr><glyph><reset> <code_sgr><CODE>:<reset> <template_text>`
**Rendered form (NO_COLOR / non-TTY):** `<glyph> <CODE>: <template_text>` with `[err]`/`[!]` substituting glyphs on non-UTF-8 locales per §4.7.

## §3 Exit-code mapping (consumed by F-07 one-shot)

Owned by F-07 D-01; restated here for INV-1 single-source-of-truth on `UlmError.exitCode()` return values:

| Code | Exit | sysexits / POSIX convention |
|------|------|-----------------------------|
| `E-CLI-CRASH` | 1 | generic failure |
| `E-HTTP-TIMEOUT` | 1 | generic failure |
| `E-INVALID-PROVIDER` | 2 | usage error |
| `E-NO-PROVIDER` | 2 | usage error |
| `E-CLI-NO-PROMPT` | 2 | usage error |
| `E-CLI-INVALID-UTF8` | 2 | usage error |
| `E-ACP-PROTOCOL` | 69 | `EX_UNAVAILABLE` |
| `E-STATE-CORRUPT` / `E-STATE-LOCK-FAILED` / `E-STATE-SCHEMA` | 74 | `EX_IOERR` |
| `E-PERMS` | 77 | `EX_NOPERM` |
| `E-CLI-TIMEOUT` | 124 | matches `timeout(1)` |
| `E-CLI-UNAUTH` | 126 | "found but not executable" |
| `E-CLI-MISSING` | 127 | "command not found" |
| `E-PROVIDER-VERSION` | 0 | warning, never blocks |

## §4 Redaction module API

```ts
// src/redact/index.ts

export const REDACT_VERSION: number;   // bump on every default-pattern change

export function scrub(line: string): string;
export function scrubWith(line: string, extra: readonly RegExp[]): string;

// Default patterns (locked; PRD §7.2):
//   /Bearer [A-Za-z0-9._-]+/g
//   /Authorization: .*$/gm                         (line-anchored at the colon)
//   /https:\/\/.*[?&](access_token|refresh_token)=[^&\s]*/g
//   /Basic [A-Za-z0-9+/=]{20,}/g

// Parses ULM_REDACT_EXTRA="<r1>,<r2>" at startup; invalid regex → console.warn once, defaults still apply.
// OR'd against defaults — additive only (D-03).
```

## §5 Color / TTY contract

Resolution order (highest precedence first):

1. `--no-color` CLI flag → `color = false`
2. `process.env.FORCE_COLOR` is truthy → `color = true`
3. `process.env.NO_COLOR` is set (any value) → `color = false`
4. `process.stdout.isTTY` falsy → `color = false`
5. else → `color = true`

Unicode resolution:

1. Windows legacy console probe (`process.env.WT_SESSION` absent + `cmd.exe` parent) → `unicode = false`
2. `process.env.LANG` / `LC_ALL` does not include `UTF-8` / `utf8` → `unicode = false`
3. else → `unicode = true`

| Condition | ANSI emitted? | Glyph |
|-----------|---------------|-------|
| `color = true` AND `unicode = true` | yes | UTF-8 `✗` / `⚠` |
| `color = true` AND `unicode = false` | yes | ASCII `[err]` / `[!]` |
| `color = false` AND `unicode = true` | no | UTF-8 `✗` / `⚠` |
| `color = false` AND `unicode = false` | no | ASCII `[err]` / `[!]` |

SGR palette: `31` (red) for `✗`, `33` (yellow) for `⚠`, `1` (bold) on the code prefix. No 256-color, no truecolor.

## §6 Consumers (downstream features that lock against this contract)

- F-02 `provider-transport` — throws `CliCrash`, `CliTimeout`, `AcpProtocol`
- F-04 `state-store` — throws `StateLocked`, `StateCorrupt`, `StateSchema`, `Perms`
- F-05 `session-management` — throws `NoProvider` (via dispatcher pre-check)
- F-06 `slash-commands` — throws `InvalidProvider`, `NoProvider`
- F-07 `one-shot-mode` — throws `CliMissing`, `CliUnauth`, `CliNoPrompt`, `CliInvalidUtf8`, all of F-02's codes
- F-03 `provider-discovery` — throws `ProviderVersion` (warning only)
