# Security Policy

## Reporting a vulnerability

If you discover a security issue in `bab`, please report it privately.

**Preferred:** GitHub Security Advisories — [open a draft advisory](https://github.com/OWNER/bab/security/advisories/new) once the repo is public.

**Fallback:** email the maintainer at `rafaelmelo007 [at] gmail [dot] com` with the subject line `bab security`.

Please do **not** open a public issue, discussion, or pull request for a security report.

## What counts as a security issue in bab

`bab` is a small surface, but the surface it has is sensitive:

| Area | What we treat as a security issue |
|---|---|
| Subprocess invocation | Command injection via provider name, model name, session ID, or prompt content |
| Session storage | Reading or writing files outside `~/.config/bab/` |
| Credential handling | Any code path where `bab` reads, stores, logs, or forwards an API key or OAuth token. `bab`'s design forbids credential handling — a violation is a critical bug. |
| Network | Any outbound connection from `bab` itself (Ollama HTTP to `localhost:11434` excepted). `bab` should never speak to a remote endpoint directly. |
| Dependency provenance | Unpinned dependencies, dependencies pulled from unsigned sources, or transitive deps that violate the rules above |

## What's out of scope

- Vulnerabilities in provider CLIs (`claude`, `codex`, `gemini`, `ollama`). Report those to their respective vendors.
- Subscription terms-of-service interpretation. PRD §6 open question 1 covers ToS confirmation; not a security issue.
- Model output content (jailbreaks, prompt injection responses). `bab` is a conduit and does not inspect responses.

## Disclosure timeline

- **48 hours**: acknowledge receipt.
- **7 days**: initial assessment + severity.
- **30 days**: fix released or a written plan with a target date.
- **90 days max**: public disclosure, coordinated with the reporter.

## Pre-1.0 note

`bab` is pre-1.0. There are no released binaries yet, so the practical attack surface today is the design itself. Issues found in the PRD or in early source builds are welcomed under the same private-disclosure policy.
