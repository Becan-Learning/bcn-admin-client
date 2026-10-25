# Admin Insights contract (backend ↔ admin)

Status: agreed 2026-10-25. Mirrored in both repos: backend `docs/admin-insights-contract.md`, admin
`docs/backend-insights-contract.md`. Change both in lockstep.

## Endpoint

`GET /api/v1/admin/insights?range=7d|30d|90d` (default `30d`; anything else is `400`).

- Auth: `requireAdmin({ user: ["list"] })`, the same permission as the Accounts list. No new
  access-control statement. Reads are not audited. Rate-limited like the Accounts list.
- One request returns every section. The admin app makes one call per page load.

## Definitions

- **Time zone:** `Asia/Riyadh` (UTC+3, no daylight saving). Every day boundary uses it.
- **Range:** `7d` and `30d` are the last 7 or 30 local days including today, from 00:00 on the
  first day to now. `90d` is the last 90 local days, bucketed by week.
- **Bucket:** `day` for `7d` and `30d`; `week` for `90d`. A week starts on Sunday (local). The first
  week bucket may start before the range start; its counts still include only data inside the range.
  Every bucket in the range is present, zero-filled. `date` is the bucket's first local day,
  `YYYY-MM-DD`.
- **Student:** an Account with `role = 'user'`. Admin Accounts are excluded everywhere, banned
  Students are included.
- **Student Session:** a `study_session` row with `kind = 'student'` whose Account is a Student.
  Admin Sessions are excluded everywhere.
- **Held Session:** a Student Session with `first_joined_at` set. Bucketed by `first_joined_at`.
- **Study seconds:** seconds of presence, counted exactly as Usage counts them
  (`sessionSecondsUsed` in `src/utils/study-session.ts`), attributed to the bucket of the Session's
  `first_joined_at`.
- **Active Student:** a Student with at least one Held Session in the bucket (or in the range, for
  the total). Distinct per bucket.
- **Signup:** a Student whose `user.created_at` falls in the bucket or range.

## Response `200`

```jsonc
{
  "range": "30d",
  "timeZone": "Asia/Riyadh",
  "bucket": "day",                       // "day" | "week"
  "from": "2026-09-26T21:00:00.000Z",    // range start (local midnight), ISO UTC
  "to": "2026-10-25T15:40:00.000Z",      // now
  "generatedAt": "2026-10-25T15:40:00.000Z",
  "totals": {
    "students": 412,          // all Students, all time
    "signups": 57,            // in range
    "activeStudents": 133,    // distinct, in range
    "heldSessions": 640,      // in range
    "studySeconds": 712345    // in range
  },
  "series": [                 // one entry per bucket, oldest first
    { "date": "2026-09-27", "signups": 3, "activeStudents": 18, "heldSessions": 22, "studySeconds": 24410 }
  ],
  "institutions": [           // every Institution, then Students with no Institution as id null
    {
      "id": "kau",            // null for "no Institution"
      "name": { "ar": "…", "en": "…" },   // null when id is null
      "students": 120,        // all time
      "signups": 14,          // in range
      "majors": [ { "id": "kau-cs", "name": { "ar": "…", "en": "…" }, "students": 40, "signups": 5 } ]
    }
  ],
  "courses": [                // every Course, sorted by heldSessions desc, then code
    {
      "id": "acct-101",
      "code": "ACCT 101",
      "name": { "ar": "…", "en": "…" },
      "heldSessions": 210,    // in range
      "studySeconds": 250000, // in range
      "activeStudents": 61,   // distinct, in range
      "chapters": [           // every Chapter of the Course, by number
        {
          "number": 1,
          "title": { "ar": "…", "en": "…" },
          "published": true,
          "heldSessions": 90,
          "studySeconds": 110000,
          "activeStudents": 48
        }
      ]
    }
  ],
  "allowance": {              // current Period of each Student; ignores `range`
    "plans": [
      {
        "id": "free",
        "name": { "ar": "…", "en": "…" },
        "students": 400,      // Students whose current Plan assignment is this Plan
        "atLimit": 37,        // Usage >= a non-null limit (sessions or seconds) in their current Period
        "usage": [            // share of the Plan's binding limit used in the current Period
          { "band": "0", "students": 210 },
          { "band": "1-25", "students": 80 },
          { "band": "26-50", "students": 40 },
          { "band": "51-75", "students": 20 },
          { "band": "76-99", "students": 13 },
          { "band": "100", "students": 37 }
        ]
      }
    ]
  }
}
```

### Allowance detail

- Current Period and Usage are computed exactly as `GET /me/allowance` computes them
  (`currentPeriod` from the current Plan assignment's `starts_at`, Usage from Student Sessions
  issued in that Period).
- "Share used" is the larger of `usage.sessions / limits.sessions` and
  `usage.seconds / limits.seconds`, over the limits that are not null. Rounded down to a whole
  percent, capped at 100. A Student with no non-null limit goes in band `"0"` and never counts as
  `atLimit`.
- Bands are always all six, in this order, zero-filled.

## Errors

- `400 INVALID_REQUEST` for a bad `range`.
- `401` and `403` as for every Admin route (including two-factor and the permission check).
