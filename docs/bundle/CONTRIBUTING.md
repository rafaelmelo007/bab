# Contributing to vertical-slices-md-dev-kit

Thanks for the interest. The kit is intentionally small — the bar for adding a new command, dimension, or artifact is high. The bar for adding *surface area* is higher.

## Before you open an issue or PR

1. **Read [`vertical-slices-ai-framework.md`](./vertical-slices-ai-framework.md).** It is the normative spec. §0 invariants and §0.1 ("what this framework forces") are non-negotiable.
2. **Read [`CHANGELOG.md`](./CHANGELOG.md).** Most "should we add X?" questions were already raised and either accepted, deferred, or rejected with rationale.
3. **For new commands or new dimensions, open an issue first.** Don't write code or doc for something the kit may never accept.

## What's in scope

- **Bug fixes** against documented behavior in the spec.
- **New reference scripts** that implement spec-described behavior (e.g., the orchestration commands are spec-described but not yet shipped as runtime binaries — implementations welcome).
- **New language/stack-specific examples** under `example/` (a Python repo example, a Rust repo example, etc.).
- **New case studies** under `case-studies/` from real adopters. See `case-studies/README.md` for the rubric.
- **Documentation clarifications** — typos, broken links, ambiguous wording.
- **Translations** of `README.md`, `ADOPTION.md`, `WALKTHROUGH.md` (the spec itself stays in English to remain normative).
- **New templates** that fit the existing artifact set (see §1 doc tree). New artifact types require spec changes.

## What's out of scope

These are settled non-goals — please don't propose them without a spec amendment first:

- A hosted SaaS dashboard. The kit is file-based by design (INV-1: single source of truth).
- Portfolio-level / cross-repo governance. Out of scope per spec §1.
- A 9th scoring dimension. Clauses (§4.7) cover the invariant-rule gap; further dimensions dilute the existing ones (see CHANGELOG v1.8 rationale).
- Backward-compatibility shims for v1.x command names. v2.0 broke them by design.
- A `dev-kit.md` instruction file *for the AI*. Use the platform-native one (`CLAUDE.md`, `GEMINI.md`, `AGENTS.md`). Minimal-surface-area principle.

## How the kit evolves

| Change type | Version bump | Examples |
|---|---|---|
| Invariant added/removed/weakened | **MAJOR** | v2.0 rename, v1.7 making security always-scored |
| New section, command, dimension, template | **MINOR** | v1.8 clauses |
| Clarification, rubric disambiguation, typo | **PATCH** | wording fixes |

A MAJOR-bump PR needs a migration table in `CHANGELOG.md` mapping every breaking change to its replacement.

## Filing a bug

Include:
- Kit version (from `CHANGELOG.md` or the spec frontmatter)
- Which file in the kit you were following (spec section, ADOPTION step, WALKTHROUGH day)
- What you did and what happened
- What you expected to happen

For broken reference scripts (`worklog-stop-hook.sh`, etc.), include OS + shell version + the exact error output.

## Filing a security issue

**Do not open a public issue for security problems.** See [`SECURITY.md`](./SECURITY.md).

## Code style for shell scripts

- POSIX-compatible bash where possible (the Stop hook targets macOS bash 3.2+ as the lowest common denominator).
- Fail-loud per INV-3: every error path either fixes the state or exits non-zero with a stderr message naming the problem.
- No silent fallbacks. If a tool is missing (`jq`, etc.), say so and exit non-zero.

## Code of conduct

Be specific. Disagreement on technical direction is fine; ad hominem is not. Assume good faith. If a PR is rejected, the reviewer owes you a reason that references either the spec or a case study — not "I don't like it."
