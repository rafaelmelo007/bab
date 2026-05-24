# Release Packaging — Feature Specification

**Status:** *computed by /vskit:project-status — do not hand-edit (INV-2)*
**Priority:** Medium
**Applies:** []
**Touches:** [.github/workflows/**, package.json, package-lock.json, tsconfig.json, bin/**, packaging/homebrew/**, packaging/aur/**, tests/onboarding/**, tests/bench/**, .npmrc, .license-allowlist.json]
**Prototype:** N/A
**Agents:** devops-lead, security-specialist, testing-lead
**Source:** docs/prds/2026-05-23-bab.md §6 — F-09; §2 G-05/G-06, §7.1 install footprint, §7.2 supply chain, §7.4 Node engines, §12 distribution, §14.2 build toolchain, §14.3 CI/release
**Last updated:** 2026-05-23

---

## §1 Problem Statement

bab's adoption story (§10.1) requires that on day 1 a user can `npm i -g bab` and get a working CLI on any platform with Node ≥ 20 LTS. This feature owns the CI + release pipeline: GitHub Actions tag-triggered workflow that bundles `src/**/*.ts` to a single `bin/bab.mjs` ESM file via esbuild, gates on install-footprint (≤ 2 MB tarball, ≤ 8 MB installed per G-06), runs `npm audit` and `license-checker-rseidelsohn`, publishes to npm with SLSA L2 provenance attestation (`npm publish --provenance` via GitHub Actions OIDC), and auto-bumps Homebrew and AUR downstream packages (both depend on Node, neither vendors a binary). Also runs the §7.1 benchmark suite and the nightly cold-install harness from G-05.

## §2 Scope

### In Scope
- Tag-triggered GitHub Actions release workflow (`.github/workflows/release.yml`), SemVer-only.
- esbuild bundle of `src/**/*.ts` → `bin/bab.mjs` (single ESM file with `#!/usr/bin/env node` shebang) per D-01. Published `files` array: `bin/`, `README.md`, `LICENSE-MIT`, `LICENSE-APACHE`, `package.json`.
- Install-footprint gates: `npm pack --dry-run` ≤ 2 MB (AC-03); post-`npm i -g` `du -sb` ≤ 8 MB (AC-04).
- `npm audit --audit-level=moderate` gate per PR; weekly nightly Low-advisory report (informational).
- `license-checker-rseidelsohn --failOn 'GPL-*;AGPL-*;LGPL-*;SSPL-1.0'` per PR (allowlist of MIT, Apache-2.0, BSD-*, ISC, 0BSD, Unlicense, CC0-1.0 in `.license-allowlist.json` per D-04).
- `package-lock.json` v3+ committed; CI runs `npm ci --ignore-scripts` (D-03 — defeats install-script attacks).
- npm publish with `--provenance` from GitHub Actions OIDC token (SLSA L2 attestation per D-02) — Node-native equivalent of cargo-dist sigstore signing.
- Cross-platform smoke matrix: Ubuntu 22.04 / 24.04, macOS 13 / 14, Windows 2022 × Node 20.10 / 22-LTS / 24 (9 cells per D-05).
- Cold-install harness (G-05): `npm i -g bab && bab -p stub "ping"` ≤ 2 min on `ubuntu-latest` (AC-06, using stub provider per D-07).
- Bench gate via tinybench (AC-14): ≥ 1000 samples per dim, p50/p95/p99 + CI bands, 10% per-dim / 20% compounded regression cap per §7.1.
- Bench noise-floor weekly recalibration; HARDWARE.md tracking GitHub runner spec.
- Homebrew formula auto-bump: `Formula/bab.rb` with `depends_on "node"`, `install` block `npm install -g --prefix=#{libexec}` (D-06).
- AUR PKGBUILD auto-bump: `depends=('nodejs>=20')`; install into `/usr/lib/node_modules/bab` with `/usr/bin/bab` shim.
- Dry-run pipeline against `v0.0.0-test.N` tags before first `v1.0.0` (§10 implementation note).
- Rollback procedure: tag `v*-rollback` triggers `npm deprecate` + Homebrew/AUR revert PR; runbook at `docs/runbooks/release-rollback.md`.

### Out of Scope
- bab self-update mechanism — explicit non-goal (§7.2). Users update via `npm update -g bab`.
- One-time platform registration (creating the Homebrew tap, registering AUR maintainer keys, initial npm name claim) — runbook, not a CI task.
- Crash-reporting infrastructure (PRD Q-09) — coordinated with F-10.
- Telemetry endpoint hosting (PRD Q-08) — orthogonal infra.
- Scoop bucket / Windows-native install — DEF-01 (deferred to v1.1).
- PyPI wrapper — explicitly dropped in PRD §12 (no Rust binary to wrap).

## §3 Acceptance Criteria

- [ ] AC-01: **Tag-triggered release workflow.** `.github/workflows/release.yml` triggers on `git push origin v*.*.*` SemVer tag, runs lint → typecheck → unit → integration → smoke matrix → publish in that order, fails fast on any step. Verified by pushing `v0.0.0-test.1` against a fork and asserting workflow reaches `npm publish --dry-run` step in ≤ 30 min wall-clock.
- [ ] AC-02: **Node engines declaration enforced.** `package.json` declares `"engines": { "node": "^20.10 || ^22 || ^24" }` and CI matrix runs lint+test on Node 20.10, 22-LTS, 24 (Ubuntu/macOS/Windows). Release-gate script re-reads `engines.node` and refuses publish if it diverges from PRD §7.4.
- [ ] AC-03: **Published tarball size gate ≤ 2 MB (G-06).** CI runs `npm pack --dry-run --json | jq '.[0].size'` and fails if > 2097152 bytes. Informational on every PR; blocking on tag push.
- [ ] AC-04: **Installed footprint gate ≤ 8 MB (G-06).** Release smoke job runs `npm i -g bab@$PUBLISHED_VERSION` inside an Ubuntu container, then `du -sb $(npm root -g)/bab` — fails if > 8388608 bytes.
- [ ] AC-05: **Single-file ESM bundle published.** Source `src/**/*.ts` is bundled via esbuild (D-01) to `bin/bab.mjs` (single ESM file with `#!/usr/bin/env node` shebang); `package.json` `files` publishes only `bin/`, `README.md`, `LICENSE-MIT`, `LICENSE-APACHE`, `package.json` — no `src/`, no `node_modules/`, no `.ts`. Verified by `npm pack --dry-run` listing.
- [ ] AC-06: **Cold-install harness ≤ 2 min (G-05).** `tests/onboarding/cold_install.sh` runs nightly on `ubuntu-latest` fresh runner: `npm i -g bab@latest && bab -p stub "ping"` (stub provider per D-07), measures wall-clock from `npm i` start to first streamed token; fails if > 120 s. Records JSON timing artifact.
- [ ] AC-07: **`npm audit` gate.** Release workflow runs `npm audit --omit=dev --audit-level=moderate` against the production lockfile and fails on any Moderate+ advisory. Weekly nightly Low report to `docs/security/audit-trend.md`.
- [ ] AC-08: **License allowlist enforced.** Release workflow runs `license-checker-rseidelsohn --production --failOn 'GPL-2.0;GPL-3.0;AGPL-1.0;AGPL-3.0;LGPL-2.1;LGPL-3.0;SSPL-1.0'` — fails on any transitive prod-tree match. Allowed licenses in `.license-allowlist.json` (D-04).
- [ ] AC-09: **`package-lock.json` committed and verified.** CI gate asserts `package-lock.json` exists, `lockfileVersion >= 3`, and `npm ci --ignore-scripts` succeeds. Release uses `npm ci` exclusively.
- [ ] AC-10: **npm publish with provenance (SLSA L2).** Release job runs `npm publish --provenance --access public` from GitHub Actions with OIDC token (`id-token: write` + `contents: read` permissions). Post-publish: `npm view bab dist.attestations` returns non-empty provenance attestation. (Resolves Q-01 — supersedes sigstore/cosign from Rust spec.)
- [ ] AC-11: **Homebrew formula auto-bump.** On successful npm publish, downstream job opens PR against `<owner>/homebrew-bab` updating `Formula/bab.rb` with new version + SHA-256 of npm tarball. Formula contains `depends_on "node"`; `install` block runs `npm install -g --prefix=#{libexec}` (D-06). `brew audit --strict --new` passes; `brew install --build-from-source` smoke succeeds.
- [ ] AC-12: **AUR PKGBUILD auto-bump.** On successful npm publish, downstream job opens PR against `<owner>/aur-bab` updating `PKGBUILD` with new `pkgver`, npm-tarball checksum, `depends=('nodejs>=20')`. Install target: `/usr/lib/node_modules/bab`; `/usr/bin/bab` symlinks `node /usr/lib/node_modules/bab/bin/bab.mjs`. `.SRCINFO` regenerated. `namcap` exits 0.
- [ ] AC-13: **Cross-platform smoke matrix.** Post-publish smoke runs `npm i -g bab@$VERSION` then `bab --version` on Ubuntu 22.04/24.04, macOS 13/14, Windows 2022, each on Node 20.10 / 22-LTS / 24 (9 cells per D-05). Failure on any cell fails release; within 72 h npm `unpublish`, after → `npm deprecate`.
- [ ] AC-14: **Bench gate via tinybench.** `tests/bench/` runs ≥ 1000 iterations per dimension, 100-iter warmup, reports p50/p95/p99 with 95% CI bands. Fails if any dim regresses > 10% vs `tests/bench/baseline.json`, OR sum of regressions across all dims > 20% per §7.1 compounded cap. Baseline refreshed weekly by nightly noise-floor job; bench runs `ubuntu-latest` only (perf gate).

## §4 Non-Functional Requirements

| Dimension | Requirement |
|-----------|-------------|
| Latency (p95) | Release pipeline end-to-end p95 ≤ 30 min over last 5 releases; any single release > 45 min fails and opens a postmortem issue. Cold-install harness (AC-06) p95 ≤ 2 min over 7 most recent nightly runs (1 outlier permitted). |
| Error budget | Flaky cross-arch smoke retried once with fresh runner, then fail the release. Failure within 72 h of publish → `npm unpublish`; after 72 h → `npm deprecate` with reason. |
| Browser support | N/A |
| Quota enforcement | N/A |
| Accessibility | N/A |
| Security | `npm audit --audit-level=moderate` gate blocks Medium+; `license-checker-rseidelsohn` blocks GPL/AGPL/LGPL/SSPL transitives; `package-lock.json` v3+ committed; `npm ci --ignore-scripts` only; `npm publish --provenance` via GitHub Actions OIDC for SLSA L2 attestation (D-02 — Node-native equivalent of sigstore); npm package MFA-write enforced via `npm access set-mfa=automation`. |
| Supply chain | dependabot.yml updates `npm` ecosystem weekly; auto-merge patch-level dev-dep bumps after CI green; GitHub-opened security advisories create release-blocking issues. |
| Provenance | Every published version has `npmjs.com/package/bab/v/$VERSION` provenance attestation, verifiable via `npm view bab dist.attestations`. Documented in README. |
| Reproducibility | Pin Node toolchain via `.nvmrc` (Node 20.10 or current LTS); pin npm version in CI; `package-lock.json` is the source of truth for resolved deps. |

## §5 Data Model

> Not applicable.

## §6 Interface Contracts

> Not applicable — `Applies` does not include `interface-contracts`. Package-manager metadata (`Formula/bab.rb`, AUR PKGBUILD) follow each ecosystem's schema.

## §7 Test Specification

| ID | Type | Description | Assertion |
|----|------|-------------|-----------|
| TC-01 | Unit | `npm pack --dry-run` size parser | Returns integer ≤ 2097152 for current build |
| TC-02 | Unit | License-allowlist enforcement | `license-checker-rseidelsohn` exits 0 against fixture lockfile with only allowed licenses; exits non-zero with GPL/AGPL fixture |
| TC-03 | Unit | esbuild bundle integrity | `bin/bab.mjs` is a single file, valid ESM, parses with `node --check`, has shebang `#!/usr/bin/env node`, no `require()` calls |
| TC-04 | Integration | `npm ci --ignore-scripts` reproducibility | Two consecutive `npm ci` runs on same lockfile produce identical `node_modules/bab/`; lockfile hash unchanged |
| TC-05 | Integration | Cross-platform smoke | `npm i -g bab` succeeds on the AC-13 matrix; `bab --version` prints the published SemVer |
| TC-06 | E2E | Cold-install harness | AC-06 script exits 0 within 120 s wall-clock against stubbed provider; emits JSON timing artifact |
| TC-07 | E2E | Bench regression detection | Inject synthetic 12% regression into one bench dim → CI fails with diagnostic naming the dim; inject 7%+7%+7% across three dims (21% compounded) → CI fails on compounded cap |
| TC-08 | Integration | Provenance attestation | After `npm publish --provenance` to a test registry (or `npm publish --dry-run --provenance` JSON output), `npm view bab dist.attestations` returns non-empty object with SLSA L2 metadata |
| TC-09 | Integration | Homebrew formula syntax | `brew audit --strict Formula/bab.rb` exits 0 against the auto-bumped formula in a Homebrew sandbox |
| TC-10 | Integration | AUR PKGBUILD lint | `namcap PKGBUILD` and `namcap *.pkg.tar.zst` in Arch container exit 0 |
| TC-11 | Unit | `engines.node` parser | Script reads `package.json` `engines.node`, asserts equals `^20.10 \|\| ^22 \|\| ^24` |
| TC-12 | Negative | Publish without OIDC token | Release workflow with `id-token: none` permission fails at `npm publish --provenance` step with clear error |

## §8 Cross-References

- **PRD:** docs/prds/2026-05-23-bab.md §6 — F-09; §2 G-05/G-06, §7.1, §7.2, §7.4, §12, §14.2, §14.3
- **Decisions:** [DECISIONS.md](./DECISIONS.md)
- **Tasks:** [TASKS.md](./TASKS.md)
- **Blocked-by:** []

## §9 Open Questions

| # | Question | Owner | Status | Resolution |
|---|----------|-------|--------|------------|
| Q-01 | Sigstore/cosign artifact signing in v1, or defer? | security-specialist | Resolved (2026-05-23) | Defer cosign; ship `npm publish --provenance` (SLSA L2 via OIDC) per D-02 — Node-native equivalent. |
| Q-02 | Linux musl static build | devops-lead | Resolved → moved to DEF-05 | No longer applicable: Node `node:alpine` Docker image works; no glibc/musl split. |
| Q-03 | npm-publish identity — automation token vs OIDC trusted publisher? | devops-lead | Open | If npm OIDC trusted-publisher is GA by v1 tag → use OIDC, eliminate long-lived token; otherwise use automation token with MFA + 90-day rotation. Resolve by v1 tag date. |
| Q-04 | Tag and version-bump workflow — `changesets` vs manual `npm version`? | devops-lead | Open | `changesets` if there will be multiple maintainers (PR-based version intent); manual `npm version <bump>` while solo. Resolve at first PR from external contributor. |
| Q-05 | Homebrew tap vs homebrew-core submission? | devops-lead | Open | Tap ships v1; submit to homebrew-core after ≥ 75 GH stars + ≥ 30 days stable + audit-clean. Resolve by day-60 §10.1 checkpoint. |

## §10 Implementation Notes

- Dry-run pipeline discipline: run the full release pipeline end-to-end against `v0.0.0-test.*` tags at least twice (once green-path, once with a deliberate AC-03 size breach) before tagging `v1.0.0`. Publishes to a scoped test package name (`@<owner>/bab-test`) on the public npm registry.
- esbuild bundling (D-01) reduces install-time resolved-dep tree — without it the package would publish ~20 npm deps as transitive installs, easily blowing the 8 MB AC-04 budget.
- npm provenance (D-02) is the Node-native equivalent of cargo-dist's sigstore: free on GitHub Actions OIDC, verifiable via `npm view`, no separate signing infra. Migration to additional cosign attestations remains an option for v1.1 if downstream packagers require it.
- AC-06 cold-install uses a stub provider (D-07) so the 2 min budget measures bab onboarding, not provider cold-start variance.
- D-05 smoke matrix (Ubuntu 22/24, macOS 13/14, Windows 2022, Node 20.10/22-LTS/24) replaces the original Rust cross-compile matrix — we're not cross-compiling, just smoke-testing install across runtimes.
- D-06 Homebrew strategy (`npm install -g --prefix=#{libexec}` with write_env_script shim) is the standard homebrew-core Node-formula pattern (see `aws-cdk`, `vercel`, `prettier`).
- Rollback runbook lives at `docs/runbooks/release-rollback.md`: tag `v*-rollback` → workflow runs `npm deprecate <bad-version>` + reverts Homebrew/AUR manifests + posts GH Release notice.
