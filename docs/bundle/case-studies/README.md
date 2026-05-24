# Case Studies

Field reports from real uses of the bundle. Each case study answers four questions:

1. **What repo / team adopted it?** (Honest about scale — solo, small team, etc.)
2. **What did they use it for?** (Which artifacts they actually exercised — not every adopter uses every part.)
3. **What did the scores tell them?** (Numbers, including the ones that revealed weakness.)
4. **What would they do differently?** (Friction, surprises, things to fix in the bundle.)

## Index

| # | Title | Adopter | Window | Outcome |
|---|---|---|---|---|
| [01](./01-self-adoption.md) | The bundle scores its own market-readiness | bundle author (Rafael Melo, via Claude Code) | 2026-05-23, single session | 5.4 → 7.6 composite on an 11-dim market-readiness rubric; 7 files shipped |
| [02](./02-ulm-bootstrap.md) | *(placeholder)* `ulm` CLI adopts the bundle | Rafael Melo / `ulm` repo | — | not yet started |

## How to add a case study

1. Copy `01-self-adoption.md` as a starting structure.
2. Fill it out honestly — the bundle gains nothing from puffery. A 5/10 score that revealed a real defect is more valuable than a 9/10 score from a feature nobody actually shipped.
3. Link it in the index above.
4. Open a PR.

## What counts as a case study

- **Real use** of any framework artifact (PRD review, SPEC + DECISIONS propagation, TASKS, SCORE, lifecycle computation, /vskit:audit-traceability, /vskit:report-overhead).
- **Real outcome** — what changed in the adopting repo as a result. Time saved, drift caught, decisions captured, scores moved. Be specific.
- **A real signal back** — the case study should name at least one improvement the bundle itself should make, or at least one bundle defect the adoption exposed.

What is **not** a case study:
- "We installed it." (That's adoption, not a case.)
- "We loved it." (That's a testimonial — add to `TESTIMONIALS.md` instead, once that file exists.)
- Marketing copy that omits the friction.

## Honest framing

Case studies are *evidence*. The Proof / Social-Proof dimension of the bundle's own marketability is meant to be earned through these, not asserted by the README. If this folder has one case study, the dimension is roughly 3–5/10. To clear 8/10, this folder needs 3+ case studies from at least 2 distinct adopters with at least one external to the bundle author.

Don't fake it. Use the bundle on real work, write down what happened, ship the case study.
