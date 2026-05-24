# Contributing to ulm

Thanks for the interest. `ulm` is small on purpose — the bar for adding code is high, and the bar for adding *surface area* is higher.

## Before you open an issue or PR

1. **Read [`prd-ulm.md`](./prd-ulm.md).** It is the source of truth. §3 (non-goals) and the "minimal surface area" principle are firm.
2. **Check the open questions in §6.** If your idea relates to one of them, comment there rather than opening a new issue.
3. **For new features, open an issue first.** Don't write code for a feature `ulm` may never accept.

## What's in scope

- Bug fixes against documented behavior in `prd-ulm.md`.
- New provider integrations (CLI of an additional LLM provider that supports ACP, `-p` exec, or a local HTTP endpoint).
- Performance work on the existing provider transports.
- Documentation, examples, asciinema casts.
- Packaging (Homebrew formula, AUR, Nix, Scoop, etc.).

## What's out of scope

These are settled non-goals — please don't propose them:

- Chat UI, TUI, or web frontend.
- Cross-provider conversation memory or context sharing.
- Token counting, cost tracking, or model benchmarking.
- Plugin system (v1).
- A `ulm.md` instruction file (use the provider's native one — `CLAUDE.md`, `GEMINI.md`, etc.)

A v2 candidate list lives in PRD §8. Discussion is welcome there; implementation is not.

## Dev setup

> The implementation language is still an open question (PRD §6 question 6). Once chosen, this section will pin the toolchain. For now: do not start a large PR until the language decision lands.

## Code style

- One commit per logical change.
- Commit messages: imperative subject, then a paragraph explaining *why*. The diff explains *what*.
- No dependencies added without an issue justifying the choice. `ulm` aims for a single binary under 10 MB; every dep affects that.

## Filing a bug

Include:
- `ulm --version`
- Provider CLI versions (`claude --version`, etc.) for the provider the bug hits
- OS and shell
- Exact command sequence that reproduces it
- What you expected vs. what happened

## Filing a security issue

**Do not open a public issue for security problems.** See [`SECURITY.md`](./SECURITY.md).

## Code of conduct

Be kind. Be specific. Assume good faith. Disagreement on technical direction is fine; personal attacks are not.
