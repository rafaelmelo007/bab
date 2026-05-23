# GitHub Actions Runner Spec

Bench gate (AC-14) runs on `ubuntu-latest`. Runner spec documented here per §7.1 — review quarterly.

| Date | Runner label | vCPU | RAM | Storage | Source |
|------|-------------|------|-----|---------|--------|
| 2026-05-23 | ubuntu-latest | 4 | 16 GB | SSD | [GitHub docs](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners) |

## Review cadence

Quarterly review: check if `ubuntu-latest` image has changed hardware class. If so, re-run baseline recalibration job and update this table.
