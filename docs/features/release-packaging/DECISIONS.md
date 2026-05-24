# Decisions — Release Packaging

**Feature:** release-packaging
**Source:** /vskit:critique-spec release-packaging (2026-05-23, self-review via general-purpose agent playing devops-lead + security-specialist + testing-lead + prompt-engineer lenses, Node-native critique after PRD §13 Q-06 flipped Rust → Node.js).
**Last updated:** 2026-05-23

## Decision Log

| ID | Date | Raised by | Question | Decision | Rationale | Updates | Supersedes |
|----|------|-----------|----------|----------|-----------|---------|------------|
| D-01 | 2026-05-23 | devops-lead | Bundle tool: esbuild vs `@vercel/ncc` vs unbundled `tsc` output | esbuild | Smallest dep, fastest, produces clean ESM with shebang preservation. ncc is opinionated for serverless (inlines node_modules but slower). Unbundled tsc means publishing dozens of `.js` files + resolved dep tree which inflates install footprint and conflicts with G-06. | SPEC §3 AC-05; SPEC §10; TASKS bundling step | — |
| D-02 | 2026-05-23 | security-specialist | Resolves Q-01: sigstore/cosign vs npm provenance | `npm publish --provenance` (SLSA L2 via OIDC) | Built into npm ≥ 9.5; free for OSS on GitHub Actions; verifiable via `npm view bab dist.attestations`; no separate signing infra. The sigstore deferral from the Rust-era spec is moot — npm provenance is the Node-native equivalent. | SPEC §4 Security NFR; AC-10; SPEC §9 Q-01 resolved | — |
| D-03 | 2026-05-23 | security-specialist | Lockfile policy | Commit `package-lock.json` v3+; CI uses `npm ci --ignore-scripts` only; renovate/dependabot weekly | Lockfile + `npm ci` gives reproducible installs; `--ignore-scripts` defeats install-script attacks (a documented npm threat vector). The bab tarball itself ships zero install scripts so end users are unaffected. | SPEC §4 supply-chain row; AC-09 | — |
| D-04 | 2026-05-23 | security-specialist | License allowlist tool | `license-checker-rseidelsohn` (maintained fork of `license-checker`) | Original `license-checker` is unmaintained since 2021; rseidelsohn fork ships current SPDX list and is the de-facto npm-ecosystem replacement. Allowlist of permitted licenses (MIT, Apache-2.0, BSD-*, ISC, 0BSD, Unlicense, CC0-1.0) in `.license-allowlist.json`; denylist of GPL/AGPL/LGPL/SSPL for belt-and-suspenders. | SPEC §14.2 toolchain row; AC-08 | — |
| D-05 | 2026-05-23 | devops-lead | Smoke matrix scope | Ubuntu 22.04 / 24.04, macOS 13 / 14, Windows 2022 × Node 20.10 / 22-LTS / 24 (9 cells) | Covers the §7.4 OS floor and all three current Node LTS lines. Reduces from the original 12-cell Rust cross-compile matrix (3 OS × 4 target triples) — we are not cross-compiling, just smoke-testing install. | AC-13 | — |
| D-06 | 2026-05-23 | devops-lead | Homebrew install strategy | `npm install -g --prefix=#{libexec}` with `write_env_script` shim | Standard Homebrew Node-formula pattern (see homebrew-core `aws-cdk`, `vercel`, `prettier`); avoids vendoring node_modules into the formula; `depends_on "node"` ensures Node ≥ 20 is present via brew's own dependency resolution. | AC-11 | — |
| D-07 | 2026-05-23 | testing-lead | Cold-install stub provider | Ship `bab-stub-provider` test fixture in `tests/onboarding/fixtures/` — a 50-line Node script echoing a canned response within 50 ms | G-05 measures bab onboarding latency, not provider latency. A stub removes the 300 ms–1.5 s provider cold-start variance from the gate so the 2 min budget tests what it claims. | AC-06; SPEC §1 problem statement clarity | — |

## Deferred Items

| ID | Item | Why deferred | Revisit when |
|----|------|--------------|--------------|
| DEF-01 | Scoop bucket / Windows-native install | Per PRD §12: Scoop bucket deferred to v1.1 (Windows users typically have Node via nvm/volta). No Scoop manifest in v1 release pipeline. | v1.1 planning, or first GitHub issue requesting it |
| DEF-02 | Reproducible-build verification | esbuild output is deterministic in principle but verifying bit-exact reproducibility across CI runs requires a second isolated rebuild + diff job; nice-to-have for SLSA L3 but not required by v1 §7.2 | When pursuing SLSA L3 / when a downstream packager (Debian) requires it |
| DEF-03 | npm-side install analytics dashboard | npm registry exposes weekly download counts via `https://api.npmjs.org/downloads/`; surfacing in a GitHub Pages dashboard is §10.1 measurement plumbing, orthogonal to the release pipeline | F-10 telemetry-opt-in or first §10.1 measurement cycle |
| DEF-04 | PyPI thin wrapper | PRD §12: dropped entirely. No longer relevant — users with Python but no Node have nvm/volta available. | Never (closed) |
| DEF-05 | Musl/Alpine support row | Was Q-02 in old Rust spec. With Node, `node:alpine` Docker image works and there's no static-binary musl/glibc split. Apk packaging tracking issue can be opened post-v1 on demand. | First AUR/Alpine-user issue |
| DEF-06 | Auto-rollback on smoke failure beyond 72h npm unpublish window | `npm deprecate` is the soft rollback; additionally yanking Homebrew/AUR bumps is operational polish | First post-release incident, or v1.1 |
