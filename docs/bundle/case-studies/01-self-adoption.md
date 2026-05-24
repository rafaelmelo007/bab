# Case Study 01 — The bundle scores its own market-readiness

**Adopter:** Rafael Melo (bundle author), via Claude Code on Windows 11
**Date:** 2026-05-23
**Window:** Single session, approximately 2 hours of wallclock
**Artifacts exercised:** scoring rubric (§7.1, §7.2), bundle structure (§1), template propagation
**Artifacts NOT exercised in this session:** PRD review, /vskit:critique spec, /implement, /vskit:audit-traceability, lifecycle state machine, /vskit:report-overhead

---

## Context

The bundle existed as a single 1027-line spec file (`vertical-slices-ai-framework.md`, v1.7) inside the `ulm` repo. The question: is this bundle *market-ready* as a drop-in methodology that another repo can adopt? Definition agreed up front: **"adoptable by another repo in under an hour."**

No external user had adopted it. No reference scripts had shipped. No worked example existed. No README beyond the spec itself.

## What happened

The bundle's **scoring methodology** was applied to evaluate the bundle's *own* market-readiness. Rubric from §7.2 (0–10 per dimension, with per-integer disambiguation) generalized to 11 product-marketability dimensions:

1. Internal coherence
2. Value proposition clarity
3. Target audience definition
4. Onboarding / quickstart
5. Differentiation vs. alternatives
6. Proof / social proof
7. Brand / product identity
8. Reference implementation availability
9. Visual communication
10. Distribution / install story
11. Commercial model

A 4-phase plan was generated to move every dimension to ≥8. Phase 0 (decisions) ran first, then Phases 1–2 (file production) executed in-session.

## Scores

**Before the session:**

| Composite | 5.4 / 10 |
|---|---|
| Dimensions ≥ 8 | 1 of 11 |
| Dimensions at 0 | 2 (Proof, Commercial model) |

**After the session:**

| Composite | 7.6 / 10 |
|---|---|
| Dimensions ≥ 8 | 8 of 11 |
| Dimensions still < 8 | Visual (7), Brand (6), Proof (3) |

Per-dimension delta in the parent session log.

## What the bundle delivered (the deliverables)

7 files shipped, grouped by artifact:

| Bundle file | Purpose | Spec section satisfied |
|---|---|---|
| `docs/bundle/README.md` | Entry point + pitch + comparison | (new — bundle-level) |
| `docs/bundle/ADOPTION.md` | Under-an-hour tutorial | (new — bundle-level) |
| `docs/bundle/CHANGELOG.md` | Version history | (new — bundle-level) |
| `docs/bundle/scripts/worklog-stop-hook.sh` | Reference Stop-hook impl | §5.2 |
| `docs/bundle/settings.json.snippet` | `.claude/` hook config | §5.2 |
| `docs/bundle/templates/{PRD,SPEC,TASKS,DECISIONS,SCORE,CLAUDE-md-snippet}.md` | Copy-paste templates | §3.2, §4.3, §4.4, §4.5, §7.3, §9 |
| `docs/bundle/example/features/demo-counter/{SPEC,TASKS,DECISIONS,SCORE,DBSCHEMA,INTERFACE-CONTRACTS}.md` | Worked example | (new — bundle-level) |

## What the bundle exposed about itself

The scoring exercise revealed **real defects in the bundle**, not just gaps in marketing surface. Documented for the next bundle revision:

1. **Spec §5.2 names a `prompt` field on the Stop event payload that does not exist.** Claude Code's Stop event delivers `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `stop_hook_active` — no `prompt`. The reference implementation works around it by parsing the transcript file for the last user message. **Bundle defect: spec §5.2 step 1 should say "derive prompt from transcript_path" rather than "read prompt from stdin JSON".**

2. **Spec assumes `jq` is available.** Not part of stated prerequisites. **Bundle defect: ADOPTION.md prereq list should include `jq`** (it now does, post-session).

3. **No tagline / brand voice in the spec.** The spec is rigorous but reads cold. The bundle README had to invent a tagline from §0.1 wholesale. **Bundle observation: framework had no marketing voice baked in — fine for a spec, exposed when used at the entry point.**

4. **Lifecycle state machine is described in a priority table (§4.1) but not drawn.** Adopters benefit from a visual; absence was a Visual-Communication score hit. **Mitigation in-session:** mermaid diagram added to ADOPTION.md.

## Honest read

This case study is **synthetic in one important way**: the adopter is the bundle author. There is no external evidence of someone unrelated to the project picking up the bundle, hitting friction, and reporting it. The defects listed above are real defects, but they were caught by the author writing reference implementations, not by an outsider reading the spec cold.

That means: **this case study is worth ~3 points on the Proof / Social-Proof dimension, not 8.** Real proof requires real external adopters. See the parent session log for the roadmap.

## What I would do differently

1. **Write the reference scripts before declaring the spec stable.** Several spec-vs-reality mismatches surfaced only when implementing.
2. **Author the worked example earlier.** The `demo-counter` folder forced concreteness on the spec in ways that re-reading the spec alone did not.
3. **Don't let "ready to market" mean "ready to be marketed *standalone*".** The bundle is a methodology that lives inside other repos; its market-readiness is "adoptable in under an hour," not "has a landing page." The first scoring pass conflated the two.

## What the next case study should be

Real adoption in the `ulm` CLI repo: convert `prd-ulm.md` to the bundle's PRD format, scaffold `docs/features/repl/`, score it, document what hurt. That case study, once written, lifts Proof from 3 toward 6.

## Reference

- Parent session log: this conversation (not committed; reconstructable from worklog once the Stop hook is wired).
- Spec version evaluated: v1.7 (2026-05-17).
