# Admin dashboard: state and handoff

Entry point for anyone (person or agent) picking up admin work. The decisions are in
[plans/admin-dashboard-v1.md](plans/admin-dashboard-v1.md) and the ADRs it names. Terms follow the backend
`GLOSSARY.md`. Last updated 2026-10-25 (Insights home page in code).

**Scope.** This dashboard does Account management and Insights. Milestone 1 is code complete on `dev`. Milestone 2
("Catalog and content") was dropped.

**Next step.** Merge the backend Insights endpoint, then the deploy of Milestone 1 (#8, below).

## Insights (home page `/`)

Shipped in code, **waits on the backend PR** for `GET /api/v1/admin/insights?range=7d|30d|90d`. The contract is
[backend-insights-contract.md](backend-insights-contract.md) (mirrored in the backend; change both together). It
was built against fixtures shaped like the contract, never against the real endpoint.

- `/` is a server component like the Accounts list: inside `<Suspense>` it reads `?range=` (`src/lib/insights/range.ts`,
  default 30 days, pure and tested), fetches with the forwarded cookie (`fetch.ts`, parsed with zod in `types.ts`) and
  hands the result to the client `InsightsView`. Picking a range is a navigation. Errors show through `Errors.<CODE>`
  with a retry; zero Students shows an empty state.
- Sections, all in `src/components/insights/`: KPI cards, four shadcn charts (Recharts; `--chart-*` tokens), Courses
  and Institutions tables whose rows open to Chapters and Majors, and Allowance by Plan (a table plus a stacked bar of
  the usage bands). Allowance is the current Period and ignores the range; the UI says so. Pure transforms are in
  `format.ts`; tests use `tests/fixtures/insights.ts`.
- Added shadcn `chart` and `toggle-group` (and `toggle`). `chart.tsx` was changed to format tooltip numbers with
  `toLocaleString("en-US")`, so digits stay ASCII in any browser locale.
- Not checked: a run against the real backend, and a visual check of the charts in a browser (a local mock backend
  confirmed the server-rendered page, the empty and error states).

## Milestone 2: reverted on 2026-10-25

Milestone 2 had merged into `dev` (admin PRs #20, #27 to #31: Institutions and Majors, Courses, Chapters,
Content versions with upload, and the release runbook). It was reverted in this repo, and in the other three
repos in parallel. The reason: it was too heavy for what Becan needs. It changed contracts in all four repos
(UUID ids, versioned content, upload tokens, a JSON Schema copy) to avoid a few SQL statements.

The simpler model that replaces it (backend ADR 0007, 2026-10-25):

- The Catalog is managed **by hand with SQL**. There is no Catalog or content UI.
- A Course id is its slug again, and a Chapter is a Course plus a number.
- Each Chapter has **one content folder on Bunny** (`courses/{course_id}/{chapter_id}/`), as before.

What this app still reads from the Catalog: the public `GET /api/v1/courses`, only to fill the Course picker in
the Enrollments card. The Institutions list for the Profile card is also public. The sidebar has Insights, Accounts, Audit
log and My account. The Audit log shows an unknown target type as its raw value.

The history is in git (`git log` for the reverted merges) and in the dropped "Catalog and content" section of
the plan.

## Milestone 1: Admin basics. Code complete, not yet deployed

Tracking issue: Becan-Learning/bcn-admin-client#1. Every code ticket is merged into `dev`. Only the deploy
remains (#8, a task for a person).

### What shipped

| Repo | PRs | What |
|---|---|---|
| backend | #25 | Better Auth `admin()` plugin, `src/lib/access-control.ts`, `accountHasPermission`, `pnpm admin:promote <email>` |
| backend | #27 | `ADMIN_ORIGIN`, CORS list, dynamic `baseURL` (`allowedHosts` + `trustedProxyHeaders`), Origin check on in tests |
| backend | #28 | `twoFactor` (TOTP + backup codes), `requireAdmin(permissions)`, the `/admin/*` hook (two-factor, 10-minute fresh session on set-role and remove-user) |
| backend | #29 | Admin Sessions: `tutor:unlimited` + two-factor means no Enrollment, no Allowance, unpublished Chapters allowed, 10800 s with `session_limit=session`; `study_session.kind`; `/me/allowance.unlimited` |
| backend | #30 | `admin_audit_log`, audit hooks, `recordAdminAction(entry, tx?)`, `GET /admin/audit-log`, `audit:read`, the update-user field allowlist, personal-data scrub on removal |
| backend | #31 | A banned Account opening a verification link is redirected to the callback with `error=BANNED_USER` |
| backend | #32 | `/admin/accounts/:id/{enrollments,allowance,sessions}`, Admin grant and end of Enrollments (`ended_by_admin`) |
| backend | #33 | `GET /admin/accounts` (multi-filter list; `listUsers` takes only one filter) |
| backend | #34 | Admin password-reset and verification-email routes (links always on the web origin); an Admin email change goes through verification |
| backend | #35 | `ADMIN_SELF_TARGET`: no banning, demoting or removing yourself |
| backend | #37 | `requireSession` reads the session uncached: a ban or a Device session revocation cuts `/api/v1` access on the next request, not after the 5-minute cookie cache |
| web | #52 | Localized `BANNED_USER` message on sign-in and verify-email |
| web | #53 | `startDecision`: unlimited Accounts start any published Chapter without an Enrollment or Allowance gate |
| admin | #10 | Scaffold: Next 16.4, shadcn (Radix), next-intl `en`, proxy rewrites, the gate (`adminGate`), sign-in, two-factor challenge and forced setup |
| admin | #11 | Audit log page, My account (name, backup codes, Device sessions), `audit:read` contract sync |
| admin | #12 | Accounts list (URL state, filters, sort, paging) |
| admin | #13 | Account detail page: header, Profile (details, email, password reset), section slots |
| admin | #14 | Enrollments, Plan and Usage, Sessions (Langfuse links via `LANGFUSE_PROJECT_URL`) |
| admin | #15 | Actions: ban, Device sessions, Role, removal; sign-in follows `next` |
| admin | #18 | Detail page layout: `max-w-5xl` so the Enrollments and Sessions tables fit, Arabic display text isolated with `<bdi>` instead of block `dir="auto"`, left-aligned action buttons |

### Verified

- Backend CI is green on every PR. The full suite has 350 tests.
- **Final end-to-end run (2026-10-15): 94 of 94 checks pass.** It ran against the real backend `dev` on a throwaway
  Postgres, with the admin app proxying on :3002. It covered:
  - sign-in through the admin proxy, two-factor enrolment and the sign-in challenge, and the gate (streamed redirects to
    `/no-access` and `/setup-two-factor`);
  - the Accounts list, search and detail page, with all eleven sections rendered;
  - Profile edits, the field allowlist, phone and duplicate-email refusals, an email change (unverified, verification
    link on the web origin), "Mark email verified", and the Admin password-reset and verification emails (links on the
    web origin, Audit log entries without tokens);
  - Actions: timed and permanent ban and unban, listing and revoking Device sessions, Role change both ways, the
    `ADMIN_SELF_TARGET` refusals, `FRESH_SESSION_REQUIRED` on set-role and remove-user with an 11-minute-old session,
    and removal with the personal-data scrub;
  - Enrollments: grant, the Plan slot limit (409), end (`ended_by_admin`), re-grant, and their Audit log entries;
  - Sessions: a Student token for an enrolled Chapter, an Admin Session on an unpublished Chapter (`kind=admin`,
    10800 s, `session_limit=session`), Usage, the Sessions list and the Langfuse link;
  - a revoked cookie refused on the next `/api/v1` request (backend #37).
- **Browser check (Playwright, headless Chromium), 17 of 17.** It signed in with two-factor through the UI, then saved a
  Profile, sent a password reset, banned and lifted a ban, opened the Role dialog, and checked the self-Account lock
  and the Student's `/no-access`. Screenshots were reviewed at 1440 px and 390 px, light and dark. No page scrolls
  sideways at 390 px. The layout issues it found are fixed in admin #18.
- The scripts live outside the repos (the session scratchpad). They are not a CI suite yet.

### Known gaps and follow-ups

- **Deploy (#8).** Each environment needs:
  - backend: `ADMIN_ORIGIN`;
  - admin: `BACKEND_URL`, optionally `LANGFUSE_PROJECT_URL`, and the `admin.` domain, with Vercel deployment protection on previews. These are the only two variables (see `.env.example`).
  - Deploy targets: the backend runs in **production on Railway** and in **staging on Render**. Point `BACKEND_URL` at the matching one.
  Promote the first Admin with `pnpm admin:promote <email>`; that Account must have signed up in the web app first.
  Then check, on staging, that a password reset requested from the admin app links to the admin domain. Vercel's rewrite headers, and the handling of `x-forwarded-host` on Railway and Render, are unconfirmed. If they don't pass the host through, links fall back to the web origin, which is safe.
- **Streamed redirects.** With Cache Components, the gate's redirect for a refused visitor is streamed (HTTP 200 plus a meta refresh), not a 307. No gated content renders. Unknown `/accounts/<id>` renders "not found" with 200.
- **A Session already running is not ended by a ban.** Since backend #37 a banned or revoked Student cannot get a new
  token, but a LiveKit room they are already in runs to its granted length (at most the Plan's longest Session). Ending
  it would need the backend to remove the participant through the LiveKit server API. Not built.
- **Bare sign-in redirect.** `proxy.ts` redirects to `/sign-in` without `next`. Only "Sign in again" sets it.
- **Impersonation.** Deferred, as decided. If it comes back, do it as a hand-off to the student app with Better Auth's one-time-token plugin.
