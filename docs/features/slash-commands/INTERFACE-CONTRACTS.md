# Interface Contracts — Slash Commands

**Feature:** slash-commands
**Source:** docs/prds/2026-05-23-ulm.md §4.5, §4.7, §4.9, §4.9.2; /vskit:critique-spec D-02 / D-04 / D-05 (2026-05-23, Node.js retrofit)
**Last updated:** 2026-05-23

> Dispatch signature is the load-bearing API between F-02, F-05, F-06, F-08. The `/help` and `/providers` byte-exact outputs are also pinned here per INV-1.

## §1 Dispatch table signature

```ts
// src/commands/types.ts

export type Handler = (
  args: readonly string[],
  ctx: ReplContext,
) => Promise<DispatchResult> | DispatchResult;

export type DispatchResult =
  | { kind: "continue" }              // re-prompt; no exit
  | { kind: "exit"; code: number }    // clean shutdown
  | { kind: "error"; error: UlmError };  // F-08 prints + reprompt

export interface CommandRegistry {
  readonly table: readonly (readonly [string, Handler])[];
}

export const HELP_ORDER = [
  "/provider", "/providers", "/new", "/sessions",
  "/resume", "/model", "/clear", "/help", "/exit",
] as const;
```

**Static command table** (order is also `HELP_ORDER` per D-03):

| Slot | Command | Handler owner | Notes |
|------|---------|---------------|-------|
| 0 | `/provider` | F-02 `providerSet` | No-arg = show current; arg = set |
| 1 | `/providers` | F-06 `providersRender` | Reads F-04 cached `[providers.*]` |
| 2 | `/new` | F-05 `sessionNew` | Clears `[sessions].<current>` |
| 3 | `/sessions` | F-05 `sessionList` | Reads provider's on-disk store |
| 4 | `/resume` | F-05 `sessionResume` | Takes session id arg |
| 5 | `/model` | F-02 `modelOverride` | Optional `save` subcommand → F-04 |
| 6 | `/clear` | F-06 `clearScreen` | `\x1B[2J\x1B[H`; NO_COLOR-aware |
| 7 | `/help` | F-06 `helpRender` | Verbatim §2 below |
| 8 | `/exit` | F-06 `exit` | Returns `{ kind: "exit", code: 0 }` |

Implicit: Ctrl-D = `/exit`; double Ctrl-C within 1 s = exit 130 (F-01 handles).

## §2 `/help` verbatim output

Source of truth: `tests/fixtures/help_output.txt` (per D-02). Reproduced here for documentation parity; the fixture is authoritative.

```
ulm commands:
  /provider [name]    set or show active provider (claude, codex, gemini, ollama)
  /providers          list providers and their detection status
  /new                start a fresh session with the current provider
  /sessions           list recent session IDs for the current provider
  /resume <id>        resume a specific past session
  /model <name>       override the model for the current provider
  /clear              clear the screen
  /help               show this message
  /exit, Ctrl-D       quit

Type any other message to send to the current provider.
For one-shot use: ulm -p <provider> "your prompt"
Docs: https://github.com/<owner>/ulm
```

## §3 `/providers` output format

Per PRD §4.9.2 — one line per provider, fixed-width columns separated by two spaces:

`<name>  <status>  <version>  <transport>`

- `<name>`: 8 chars left-aligned
- `<status>`: glyph `✓` (ready) / `⚠` (warning) / `✗` (missing) — adjacent text in status column per §7.3 accessibility
- `<version>`: 8 chars; `—` (em-dash, U+2014) if missing
- `<transport>`: free-form trailing column (`acp`, `exec`, `http`, or `exec (below minimum 0.6.0)`); `—` if missing

**Glyph fallback** (per §4.7): under `NO_COLOR=1` or non-UTF-8 locale, `✓ → [ok]`, `⚠ → [!]`, `✗ → [err]`, em-dash `— → -`.

**Example (UTF-8 + color):**

```
claude   ✓  1.4.2   acp
codex    ✓  0.8.1   exec
gemini   ⚠  0.5.0   exec (below minimum 0.6.0)
ollama   ✗  —       —
```

## §4 Unknown-command suggestion

Format:

```
✗ unknown command: /<input>. Try /help.
Did you mean /<closest>?
```

The second line appears only when at least one known command has Levenshtein distance ≤ 2 from `<input>` (via `fastest-levenshtein`). Ties resolved by index in `HELP_ORDER` (D-03), NOT by lexical sort.

## §5 Tokenizer contract

Input → `{ cmd: string; args: string[] }`. Pure whitespace split (`input.trim().split(/\s+/)`). No shell metacharacter interpretation:

- `;`, `&`, `|`, `` ` ``, `$()`, `>`, `<`, `&&`, `||` — all passed through as plain argv tokens.
- No quoting, no escape sequences, no env-var expansion.

Args reach handlers as `readonly string[]`; CI grep on `src/commands/` blocks any `` `${cmd} ${args.join(' ')}` `` shell-style concatenation.

## §6 Error vocabulary

Slash-commands dispatcher throws these F-08 subclasses (see [F-08 INTERFACE-CONTRACTS.md](../error-surfaces/INTERFACE-CONTRACTS.md)):

- `NoProvider` — pre-check before any non-slash input
- `InvalidProvider` — bubble-up from F-02 `/provider <bad>` handler
- Unknown-command surface (§4) is NOT a `UlmError` subclass; it's a local render in this feature.
