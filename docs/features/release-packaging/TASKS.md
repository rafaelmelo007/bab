# Tasks — Release Packaging

**Feature:** release-packaging
**Source:** SPEC.md (14 ACs), DECISIONS.md (D-01..D-07)
**Last updated:** 2026-05-23

| ID | Description | Owner | Priority | Status | Linked ACs | Decision |
|----|-------------|-------|----------|--------|------------|----------|
| T-01 | Author `package.json`: name `bab`, MIT+Apache dual license per PRD Q-07, `engines.node: "^20.10 \|\| ^22 \|\| ^24"`, `bin: { bab: "bin/bab.mjs" }`, `type: "module"`, `files: ["bin", "README.md", "LICENSE-MIT", "LICENSE-APACHE"]` | devops-lead | High | Done | AC-02, AC-05 | — |
| T-02 | Author `tsconfig.json` (`target: "es2022"`, `module: "nodenext"`, strict mode) | devops-lead | High | Done | (foundational) | — |
| T-03 | Author `.nvmrc` pinning Node 20.10 (or current LTS) | devops-lead | High | Done | (foundational) | — |
| T-04 | Author esbuild config (`scripts/build.mjs` or `esbuild.config.mjs`): bundle `src/index.ts` → `bin/bab.mjs` as single ESM file with `#!/usr/bin/env node` shebang preserved | devops-lead | High | Done | AC-05 | D-01 |
| T-05 | Add bundle integrity check: `node --check bin/bab.mjs`; verify no `require()` calls in output | testing-lead | High | Done | TC-03 | — |
| T-06 | Author `.github/workflows/release.yml`: trigger on `v*.*.*` SemVer tag; jobs lint → typecheck → unit → integration → smoke matrix → publish; `permissions: { contents: write, id-token: write }` for OIDC provenance | devops-lead | High | Done | AC-01, AC-10 | D-02 |
| T-07 | Add release-gate script asserting `package.json` `engines.node` matches PRD §7.4 verbatim; fail publish if it drifts | devops-lead | Medium | Done | AC-02 | — |
| T-08 | Add tarball-size gate: `npm pack --dry-run --json | jq '.[0].size'` ≤ 2097152; blocking on tag push, informational on PR | devops-lead | High | Done | AC-03 | — |
| T-09 | Add installed-footprint gate: `npm i -g bab@$PUBLISHED_VERSION` in Ubuntu container, `du -sb $(npm root -g)/bab` ≤ 8388608 | devops-lead | High | Done | AC-04 | — |
| T-10 | Author cold-install harness `tests/onboarding/cold_install.sh`: fresh runner, `npm i -g bab && bab -p stub "ping"` ≤ 120 s; emit JSON timing artifact | testing-lead | High | Done | AC-06 | D-07 |
| T-11 | Author stub provider `tests/onboarding/fixtures/bab-stub-provider.mjs` (50 LOC) echoing canned response within 50 ms — isolates cold-install gate from provider variance | testing-lead | High | Done | AC-06 | D-07 |
| T-12 | Wire `npm audit --omit=dev --audit-level=moderate` gate in CI (PR + tag); fail on Moderate+ advisory | security-specialist | High | Done | AC-07 | — |
| T-13 | Add weekly nightly job `audit-weekly.yml` reporting Low advisories to `docs/security/audit-trend.md` (non-blocking) | security-specialist | Medium | Done | AC-07 | — |
| T-14 | Author `.license-allowlist.json` listing MIT, Apache-2.0, BSD-*, ISC, 0BSD, Unlicense, CC0-1.0 | security-specialist | High | Done | AC-08 | D-04 |
| T-15 | Wire `license-checker-rseidelsohn --production --failOn 'GPL-2.0;GPL-3.0;AGPL-1.0;AGPL-3.0;LGPL-2.1;LGPL-3.0;SSPL-1.0'` in CI; fail on any transitive prod-tree match | security-specialist | High | Done | AC-08 | D-04 |
| T-16 | Commit `package-lock.json` v3+; add CI gate asserting `lockfileVersion >= 3` and `npm ci --ignore-scripts` succeeds | security-specialist | High | Done | AC-09 | D-03 |
| T-17 | Wire `npm publish --provenance --access public` step in release.yml using GitHub Actions OIDC; verify post-publish via `npm view bab dist.attestations` | security-specialist | High | Done | AC-10 | D-02 |
| T-18 | Author downstream Homebrew formula template at `packaging/homebrew/bab.rb`: `depends_on "node"`, `install` runs `npm install -g --prefix=#{libexec}`, `bin/bab` write_env_script shim | devops-lead | High | Done | AC-11 | D-06 |
| T-19 | Wire homebrew-bumper job: on successful npm publish, open PR against `<owner>/homebrew-bab` updating version + tarball SHA-256 | devops-lead | High | Done | AC-11 | — |
| T-20 | Author AUR PKGBUILD template at `packaging/aur/PKGBUILD`: `depends=('nodejs>=20')`, install into `/usr/lib/node_modules/bab`, `/usr/bin/bab` symlinks `node /usr/lib/node_modules/bab/bin/bab.mjs` | devops-lead | High | Done | AC-12 | — |
| T-21 | Wire AUR-bumper job: on successful npm publish, open PR against `<owner>/aur-bab` updating `pkgver` + checksum + `.SRCINFO` | devops-lead | High | Done | AC-12 | — |
| T-22 | Implement cross-platform smoke matrix (9 cells per D-05): Ubuntu 22.04 / 24.04, macOS 13 / 14, Windows 2022 × Node 20.10 / 22-LTS / 24 — `npm i -g bab@$VERSION && bab --version` | testing-lead | High | Done | AC-13, TC-05 | D-05 |
| T-23 | Wire rollback automation: tag `v*-rollback` → `npm deprecate` (or `unpublish` within 72h) + Homebrew/AUR revert PR + GH Release notice; document runbook at `docs/runbooks/release-rollback.md` | devops-lead | Medium | Done | (NFR Reliability) | — |
| T-24 | Author `tests/bench/` harness using tinybench: ≥ 1000 samples per dimension, 100-iter warmup, reports p50/p95/p99 with 95% CI; baseline stored at `tests/bench/baseline.json` per D-05 | perf-specialist | High | Done | AC-14 | D-01 (esbuild) |
| T-25 | Wire bench-regression gate: fails on any dim > 10% regression vs baseline OR sum of regressions > 20% per §7.1 | perf-specialist | High | Done | AC-14, TC-07 | — |
| T-26 | Wire weekly bench-noise-floor recalibration nightly job: run suite 5× back-to-back on idle runner; CoV > 5% twice opens issue + auto-widens gates to `max(10%, 2×CoV)` | perf-specialist | Medium | Done | AC-14 (NFR sub) | — |
| T-27 | Track GitHub Actions runner spec in `docs/technical/HARDWARE.md`; review quarterly | devops-lead | Low | Done | (NFR Reliability) | — |
| T-28 | Wire dependabot.yml for npm ecosystem (weekly), auto-merge patch-level dev-dep bumps after CI green | security-specialist | Medium | Done | (NFR Supply chain) | — |
| T-29 | Author release-pipeline dry-run discipline doc: run full pipeline against `v0.0.0-test.N` tags at least twice (once green-path, once with deliberate AC-03 size breach) before `v1.0.0` | devops-lead | Medium | Done | (SPEC §10) | — |
| T-30 | Write vitest unit test for `npm pack --dry-run` size parser (TC-01) | testing-lead | Medium | Done | TC-01 | — |
| T-31 | Write vitest unit test for license-allowlist enforcement against MIT-only fixture vs GPL fixture (TC-02) | testing-lead | High | Done | TC-02 | D-04 |
| T-32 | Write integration test for `npm ci --ignore-scripts` reproducibility: two consecutive runs produce identical `node_modules/bab/` | testing-lead | High | Done | TC-04 | D-03 |
| T-33 | Write integration test for provenance attestation: `npm view bab dist.attestations` returns non-empty SLSA L2 metadata | testing-lead | High | Done | TC-08 | D-02 |
| T-34 | Write Homebrew formula syntax test: `brew audit --strict packaging/homebrew/bab.rb` exits 0 in sandbox | testing-lead | Medium | Done | TC-09 | D-06 |
| T-35 | Write AUR PKGBUILD lint test: `namcap PKGBUILD` exits 0 in Arch container | testing-lead | Medium | Done | TC-10 | — |
| T-36 | Write negative test: release workflow with `id-token: none` fails at `npm publish --provenance` step with clear error | testing-lead | High | Done | TC-12 | D-02 |
| T-37 | Document Q-03 (publish identity), Q-04 (version-bump), Q-05 (Homebrew tap vs core) resolution gates in `docs/runbooks/release-decisions.md` | prompt-engineer | Low | Done | (§9 Open Questions) | — |

**Status values:** Pending → In Progress → In Review → Done
**Decision column:** `D-NN` slug from DECISIONS.md when the task only exists because of a critique decision; `—` otherwise.
