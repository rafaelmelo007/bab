---
description: Aggregate last 7 days of worklog. Report tokens, wallclock, top commands, breach status vs §5.3 weekly budget. Archives dailies > 90 days.
---

You are running `/vskit:report-overhead` per §5.3 of `docs/bundle/vertical-slices-ai-framework.md`.

1. Glob `docs/worklog/*.md` and read the last 7 days' files.
2. Aggregate: total tokens, total wallclock, count per command, top 5 commands by tokens.
3. Read `CLAUDE.md` for `Weekly token budget:` override — fall back to §5.3 default of 100 000.
4. Compute breach: tokens_7d > budget. Track consecutive breaches across runs (read prior `/vskit:report-overhead` entries from worklog).
5. **Side effect:** move daily files older than 90 days into `docs/worklog/_archive/YYYY-MM.md` (concatenated by month).
6. Print the report. If two consecutive breaches, surface the §5.3 rule: scope reduction or framework drop is required.
