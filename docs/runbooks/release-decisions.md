# Release Open Questions — Resolution Gates

Per SPEC.md §9 Q-03, Q-04, Q-05 — resolve before tagging v1.0.0.

## Q-03: Publish identity

- **Question:** npm automation token vs OIDC trusted publisher?
- **Resolution gate:** If npm OIDC trusted-publisher is GA by the v1 tag date → switch to OIDC (removes long-lived token). Otherwise use automation token with MFA + 90-day rotation.
- **Owner:** devops-lead

## Q-04: Tag and version-bump workflow

- **Question:** `changesets` vs manual `npm version`?
- **Resolution gate:** Use manual `npm version <bump>` while solo. Switch to `changesets` at first PR from external contributor.
- **Owner:** devops-lead

## Q-05: Homebrew tap vs homebrew-core submission

- **Question:** Ship via personal tap or submit to homebrew-core?
- **Resolution gate:** Tap ships v1. Submit to homebrew-core after: ≥75 GH stars + ≥30 days stable + audit-clean. Check at day-60 §10.1 checkpoint.
- **Owner:** devops-lead
