# Worked example — `demo-counter`

This folder is a **populated example feature folder** to show what the framework looks like in motion. It is not real code — there is no implementation behind it. Read it after you finish [`../ADOPTION.md`](../ADOPTION.md) but before you fill out your own SPEC.

## What `demo-counter` does (hypothetically)

A tiny HTTP service exposing two endpoints:

- `POST /click` — record a click for a campaign name
- `GET /click/:campaign` — return the count for a campaign

The point is not the feature. The point is that this feature has just enough surface to exercise every artifact the framework produces:

| Spec file | Why this example needs it |
|---|---|
| `SPEC.md` | Always required |
| `TASKS.md` | Always required |
| `SCORE.md` | Always required |
| `DECISIONS.md` | Always required |
| `DBSCHEMA.md` | `clicks` table — `Applies: dbschema` is true |
| `INTERFACE-CONTRACTS.md` | Two HTTP endpoints — `Applies: interface-contracts` is true |
| `CLAUSES.md` | 3 invariant rules with AI-graded checks — `Applies: clauses` is true (§4.7) |
| (no `prototypes/`) | No user-facing UI — `Applies` omits `ux` and `prototype` |

## What the score tells you

The SCORE.md in this folder shows a feature **below ship gate** on purpose. Composite is 7.2, Test Coverage is 6, NFR Compliance is 6, Documentation is 9. The improvement actions list names exactly what would need to change to clear the gate.

That's the framework working as designed: a score that's honest about what isn't done yet.

## How to use this example

1. Read `SPEC.md` first. Notice the `Applies:` line, the `Touches:` pathspec, the §3 ACs that are *independently verifiable*, the cross-references to DECISIONS rows.
2. Read `DECISIONS.md` second. Notice how every row's `Updates` column points to a specific section of SPEC / DBSCHEMA / INTERFACE-CONTRACTS — that is the §4.5 propagation contract.
3. Read `TASKS.md` third. Notice how a task that exists *because of* a decision carries the `Decision: D-NN` column populated.
4. Read `SCORE.md` last. Notice how Documentation can be 9 while Test Coverage is 6 — these dimensions are scored independently and the composite is never used to hide a weak dimension.

Then go fill out your own.
