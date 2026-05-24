# bab

**One gate, many minds.** A unified CLI gateway to Claude, Codex, Gemini, and Ollama.

> Status: **pre-1.0** — implementation in progress. Not yet published to npm / Homebrew.

---

## Getting started

**Requirements:** Node.js ≥ 20.10 and at least one provider CLI already installed and logged in (`claude`, `codex`, `gemini`, or `ollama`).

```bash
# Install
npm install -g bab

# Launch
bab
```

```
bab> /provider claude
✓ provider set to claude
bab (claude)> explain monads in one paragraph
Monads are a way to chain computations that carry context...
bab (claude)> /provider gemini
✓ provider set to gemini
bab (gemini)> same question, second opinion?
In Haskell, monads are...
```

**One-shot mode** (pipe-friendly):

```bash
echo "summarise this" | bab -p claude
bab -p gemini "what is the time complexity of timsort?"
```

**Slash commands:**

| Command | What it does |
|---------|-------------|
| `/provider <name>` | Switch active provider (`claude`, `codex`, `gemini`, `ollama`) |
| `/providers` | List all detected providers and their status |
| `/sessions` | List saved sessions for the active provider |
| `/resume <id>` | Resume a previous session |
| `/new` | Start a fresh session |
| `/model <name>` | Switch model within the active provider |
| `/clear` | Clear the screen |
| `/help` | Show all commands |
| `/exit` | Quit |

---

## What it is

`bab` is a single command-line tool that routes prompts to one of four LLM providers — **Claude**, **Codex** (OpenAI), **Gemini**, or **Ollama** — by invoking each provider's official CLI as a subprocess. Pick a provider once with `/provider`, then keep chatting. Switch any time.

It reuses your existing **subscriptions** (Claude Max, ChatGPT Plus, Gemini Advanced) and your **local Ollama install**. No API keys. No new accounts. No new bills.

## Why bab

- **Stop juggling four shells.** Every provider ships its own CLI with its own flags, its own `--resume`, its own session storage. `bab` is one prompt across all of them.
- **Use the subscriptions you already pay for.** API keys cost money on top of your Claude Max / ChatGPT Plus / Gemini Advanced. `bab` shells out to the official CLIs so your subscription is the only auth.
- **Stay out of your way.** `bab` stores no conversation content. Session IDs only. No proxy layer to debug, no third place to put system prompts.

## Providers

| Provider | Transport | Auth | Status |
|---|---|---|---|
| Claude (Anthropic) | ACP over stdio | `claude login` | v1 |
| Codex (OpenAI) | ACP over stdio | `codex login` | v1 |
| Gemini (Google) | `gemini -p` exec | `gemini auth` | v1 |
| Ollama | HTTP `localhost:11434` | none (local) | v1 |

Detection is automatic on first run. Missing providers don't block startup — `/providers` reports their status.

## How it works

`bab` is a thin REPL. Every plain message goes through a `ProviderTransport` that talks to the active provider CLI via one of three modes (ACP → exec → HTTP, in that order of preference). `bab` itself stores nothing beyond the last session ID per provider.

Full design in [`docs/prds/2026-05-23-bab.md`](./docs/prds/2026-05-23-bab.md). Notable principles:

- **Zero credential handling.** `bab` never reads or stores API keys. If a provider isn't logged in, you get its native error.
- **Lightweight.** Single ESM bundle (`bin/bab.mjs`), ≤ 2 MB tarball, ≤ 8 MB installed.
- **Daemon mode is a v2.** v1 spawns fresh per turn. The transport layer is abstracted so a future warm-daemon path drops in without breaking the CLI.

## How is this different from…

| Tool | Difference from bab |
|---|---|
| Provider CLIs directly | bab is one prompt across all four. No `claude … && switch shell && codex …` |
| [simonw/llm](https://llm.datasette.io/) | `llm` uses API keys; bab uses your subscriptions via the official CLIs |
| [aichat](https://github.com/sigoden/aichat) | aichat is its own client with its own session model; bab delegates everything to provider CLIs |
| [mods](https://github.com/charmbracelet/mods) | mods is API-key first and Charm-styled output; bab keeps each provider's native output |

## Roadmap

- **v1** — REPL + 4 providers + slash commands. Subprocess-per-turn. npm publish with provenance.
- **v2 candidates** — daemon mode (warm provider CLIs), `/all` fan-out, `/pipe` between providers, conversation export.

## Contributing

Issues and discussion welcome — please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first. The non-goals in the [PRD](./docs/prds/2026-05-23-bab.md) §3 are firm; "minimal surface area" is a feature.

For security reports, see [`SECURITY.md`](./SECURITY.md).

## License

Dual-licensed under [MIT](./LICENSE-MIT) and [Apache-2.0](./LICENSE-APACHE) © 2026 Rafael Melo

## The name

From the Akkadian *bāb* — "gate." The root of Babylon (*Bāb-ilim*, "gate of the god"). A living word in Arabic (باب), Persian, Hebrew, and Turkish meaning gate, doorway, or chapter. One gate, many destinations beyond it.
