# Security Policy

## Reporting a vulnerability

If you discover a security issue in `ulm`, please report it privately.

**Preferred:** GitHub Security Advisories — [open a draft advisory](https://github.com/OWNER/ulm/security/advisories/new) once the repo is public.

**Fallback:** email the maintainer at `rafaelmelo007 [at] gmail [dot] com` with the subject line `ulm security`.

Please do **not** open a public issue, discussion, or pull request for a security report.

## What counts as a security issue in ulm

`ulm` is a small surface, but the surface it has is sensitive:

| Area | What we treat as a security issue |
|---|---|
| Subprocess invocation | Command injection via provider name, model name, session ID, or prompt content |
| Session storage | Reading or writing files outside `~/.config/ulm/` |
| Credential handling | Any code path where `ulm` reads, stores, logs, or forwards an API key or OAuth token. `ulm`'s design forbids credential handling — a violation is a critical bug. |
| Network | Any outbound connection from `ulm` itself (Ollama HTTP to `localhost:11434` excepted). `ulm` should never speak to a remote endpoint directly. |
| Dependency provenance | Unpinned dependencies, dependencies pulled from unsigned sources, or transitive deps that violate the rules above |

## What's out of scope

- Vulnerabilities in provider CLIs (`claude`, `codex`, `gemini`, `ollama`). Report those to their respective vendors.
- Subscription terms-of-service interpretation. PRD §6 open question 1 covers ToS confirmation; not a security issue.
- Model output content (jailbreaks, prompt injection responses). `ulm` is a conduit and does not inspect responses.

## Disclosure timeline

- **48 hours**: acknowledge receipt.
- **7 days**: initial assessment + severity.
- **30 days**: fix released or a written plan with a target date.
- **90 days max**: public disclosure, coordinated with the reporter.

## Pre-1.0 note

`ulm` is pre-1.0. There are no released binaries yet, so the practical attack surface today is the design itself. Issues found in the PRD or in early source builds are welcomed under the same private-disclosure policy.
