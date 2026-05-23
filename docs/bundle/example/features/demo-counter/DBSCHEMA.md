# DB Schema — Click Counter

**Feature:** demo-counter
**Last updated:** 2026-05-23

## Tables

### `clicks`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `bigserial` | PRIMARY KEY | |
| `campaign` | `text` | NOT NULL, length ≤ 64 (CHECK), NFC-normalized at insert | indexed |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

### Indexes

| Name | Columns | Type | Why |
|---|---|---|---|
| `clicks_campaign_idx` | `campaign` | btree | `GET /click/:campaign` must hit this index, not seq-scan. Confirmed in M-01 with `EXPLAIN`. |

## Migrations

### M-01 — 2026-05-20 — Create `clicks` table

**Up steps**

```sql
CREATE TABLE clicks (
  id          bigserial   PRIMARY KEY,
  campaign    text        NOT NULL CHECK (length(campaign) <= 64),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clicks_campaign_idx ON clicks (campaign);
```

**Down steps (rollback)**

```sql
DROP INDEX IF EXISTS clicks_campaign_idx;
DROP TABLE IF EXISTS clicks;
```

**Back-compat assertion**

This is an additive migration introducing a brand-new table. No existing code reads or writes `clicks` before this migration; no existing code becomes invalid after it. No coordinated deploy window is required. Per spec §4.6, additive new-table changes are exempt from the back-compat requirement — this section is included anyway to document the explicit absence of risk.

The Down migration is safe because the table is one-way append-only: a rollback discards data that has not yet been read by any downstream system (BI tool queries are idempotent; recreating the table on re-deploy starts the count fresh, which marketing has accepted in D-04 / D-05 context).
