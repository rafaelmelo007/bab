# Interface Contracts — Click Counter

**Feature:** demo-counter
**Last updated:** 2026-05-23

## HTTP Endpoints

### `POST /click`

Record one click for a campaign.

| Field | Value |
|---|---|
| Auth | **None** — public endpoint by design (DECISIONS D-05) |
| Rate limit | 60 req/min per source IP (DECISIONS D-01) |
| Idempotency | No — each request increments the count |

**Request body (JSON):**

```json
{ "campaign": "spring_promo_2026" }
```

Or equivalently, query string: `POST /click?campaign=spring_promo_2026`.

**Validation:**
- `campaign` is required (AC-02). Missing → `400 { "error": "campaign required" }`.
- `campaign` is normalized to Unicode NFC then checked for length ≤ 64 (AC-03, DECISIONS D-02). Over → `400 { "error": "campaign too long" }`.

**Responses:**

| Status | Body | When |
|---|---|---|
| `204 No Content` | — | Click recorded (AC-01) |
| `400 Bad Request` | `{ "error": "<reason>" }` | Validation failure |
| `429 Too Many Requests` | `{ "error": "rate limit" }`, `Retry-After: <s>` header | IP exceeded 60 req/min (AC-04) |
| `500 Internal Server Error` | `{ "error": "internal" }` | Unexpected error; logged with correlation ID |

---

### `GET /click/:campaign`

Return the click count for a campaign.

| Field | Value |
|---|---|
| Auth | **None** — public endpoint by design (DECISIONS D-05) |
| Rate limit | None |
| Caching | `Cache-Control: max-age=10` — short cache to reduce DB load on bursty BI polling |

**Path parameter:** `campaign` — URL-encoded.

**Responses:**

| Status | Body | When |
|---|---|---|
| `200 OK` | `{ "campaign": "<name>", "count": <int> }` | Always (AC-05, AC-06). `count` is 0 for unseen campaigns; no 404. |
| `500 Internal Server Error` | `{ "error": "internal" }` | Unexpected error |

## Log contract

Every request emits one structured-JSON log line. Schema:

```json
{
  "ts":       "<ISO-8601 UTC>",
  "level":    "info" | "warn" | "error",
  "endpoint": "POST /click" | "GET /click/:campaign",
  "campaign": "<value if known, after NFC + length check>",
  "status":   <int>,
  "duration_ms": <int>
}
```

**Never logged** (DECISIONS D-03):
- Client IP address
- User agent
- Request headers other than the route
- Request body beyond the `campaign` field
