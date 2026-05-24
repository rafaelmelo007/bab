# Case Study 02 — `ulm` CLI adopts the bundle

**Status:** placeholder — adoption not yet started.

**Adopter:** Rafael Melo / `ulm` repo (the CLI gateway, not the bundle author hat)
**Date:** *to be filled when the work happens*

---

## Why this case study exists

The `ulm` repo (this repo) contains both the bundle and the `ulm` CLI product. The CLI has a PRD (`prd-ulm.md`) and zero implementation. It is a fresh greenfield repo — the exact shape the bundle's recommended persona ("solo dev / staff eng on greenfield AI repos") describes.

Adopting the bundle on `ulm` produces:

1. **Real evidence** of the bundle running on a real (single-user) repo, not a worked example.
2. **A second case study**, lifting Proof from 3 → ~6.
3. **A live test** of whether the §11 adoption checklist + ADOPTION.md tutorial actually work in under an hour.

## Pre-adoption state (snapshot 2026-05-23)

- `prd-ulm.md` exists at repo root, ~13 KB, scoped to a product PRD.
- No `docs/PRD.md`, no `docs/features/`, no `docs/worklog/`.
- No `CLAUDE.md` §Commands section yet.
- No Stop hook wired.

## What to fill out when adoption happens

### 1. Time-to-adopt
- Wallclock from "decide to adopt" to "first commit with `Closes-AC:` trailer". Target: under 60 minutes per ADOPTION.md.

### 2. Friction list
- Anything the ADOPTION tutorial missed.
- Any spec ambiguity that required a re-read.
- Any reference script that did not work out of the box on Windows.

### 3. First feature scored
- Recommended first feature: `repl` (the persistent REPL itself per PRD §4.1–4.5).
- Score every dimension. Expect a low initial score — the goal is to capture the *starting* number, not impress.

### 4. Bundle defects exposed
- Same format as case study 01: numbered list, each defect with a "Bundle defect:" callout naming what should change in the spec or the reference impl.

### 5. Honest takeaway
- Was the bundle worth the overhead at this repo's stage?
- What would have to be true for the answer to flip?

## What this case study is NOT

- Not a "look, it works" piece. The bundle's own §5.3 forces a *drop* decision after two consecutive weekly token-budget breaches. If `ulm` adopts the bundle and it breaches, the case study records that and ends with a drop, not with a save.
- Not a generic testimonial. Case studies are evidence, not endorsements.

---

*When the adoption happens, replace this placeholder with the actual case study and update the [index](./README.md).*
