# Security Policy

## Reporting a vulnerability

If you discover a security issue in `vertical-slices-md-dev-kit`, please report it privately.

**Preferred:** GitHub Security Advisories — once this repo is public, open a draft advisory at `github.com/OWNER/vertical-slices-md-dev-kit/security/advisories/new`.

**Fallback:** email `rafaelmelo007 [at] gmail [dot] com` with the subject line `vskit security`.

Please do **not** open a public issue, discussion, or pull request for a security report.

## What counts as a security issue

The kit is a markdown methodology plus a small set of shell scripts. Surface area is small but it has sharp edges:

| Area | What we treat as a security issue |
|---|---|
| `scripts/worklog-stop-hook.sh` | Command injection via prompt content, session ID, or transcript path. Path traversal in worklog file resolution. Arbitrary file write outside `docs/worklog/`. |
| Settings hook reference | Any payload from the Stop event JSON that escapes shell quoting and executes arbitrary commands. |
| Templates | Markdown content that, when copied into an adopter's repo, exfiltrates data or executes unexpected code (e.g., a template that triggers a tool-use on render). |
| Reference impls of `/vskit:*` commands (when shipped) | Any code path that reads/writes outside `docs/`, calls network, or invokes a subprocess without the adopter's consent. |

## What's out of scope

- Vulnerabilities in Claude Code itself, or in other AI assistants. Report those to their vendors.
- The methodology's quality of advice. If the spec recommends an approach you consider insecure (e.g., default rate-limit thresholds), file a regular issue, not a security report.
- Hypothetical attacks against an adopter's repo that don't involve the kit's own scripts/templates.

## Disclosure timeline

- **48 hours**: acknowledge receipt
- **7 days**: initial assessment + severity rating
- **30 days**: fix released, or a written plan with a target date
- **90 days max**: coordinated public disclosure with credit (unless you prefer anonymity)

## Pre-launch note

This kit is pre-1.0-public (the methodology is at v2.0, but no GitHub release has cut yet at the time of writing). The practical attack surface is the design itself — issues found in the spec or in source builds are welcomed under the same private-disclosure policy.
