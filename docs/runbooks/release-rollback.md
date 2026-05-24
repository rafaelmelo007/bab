# Release Rollback Runbook

## Trigger

Push a `v<VERSION>-rollback` tag:

```
git tag v1.2.3-rollback
git push origin v1.2.3-rollback
```

The `rollback.yml` workflow automatically runs `npm deprecate` on the bad version and creates a GH Release notice.

## Manual steps if automation fails

### Within 72 h of publish

```bash
npm unpublish ulm@<VERSION>
```

### After 72 h

```bash
npm deprecate ulm@<VERSION> "REVERTED: <reason>"
```

### Homebrew revert

Open a PR against `<owner>/homebrew-ulm` reverting `Formula/ulm.rb` to the previous version + SHA.

### AUR revert

Open a PR against `<owner>/aur-ulm` reverting `PKGBUILD` and `.SRCINFO`.

## Decision reference

DEF-06 (release-packaging DECISIONS.md): `npm deprecate` is the v1 soft rollback mechanism.
