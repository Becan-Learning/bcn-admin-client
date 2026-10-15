# Admin dashboard: state and handoff

Entry point for anyone (person or agent) picking up admin work. The decisions are in
[plans/admin-dashboard-v1.md](plans/admin-dashboard-v1.md) and the ADRs it names. Terms follow the backend
`GLOSSARY.md`. Last updated 2026-10-15.

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
| web | #52 | Localized `BANNED_USER` message on sign-in and verify-email |
| web | #53 | `startDecision`: unlimited Accounts start any published Chapter without an Enrollment or Allowance gate |
| admin | #10 | Scaffold: Next 16.4, shadcn (Radix), next-intl `en`, proxy rewrites, the gate (`adminGate`), sign-in, two-factor challenge and forced setup |
| admin | #11 | Audit log page, My account (name, backup codes, Device sessions), `audit:read` contract sync |
| admin | #12 | Accounts list (URL state, filters, sort, paging) |
| admin | #13 | Account detail page: header, Profile (details, email, password reset), section slots |
| admin | #14 | Enrollments, Plan and Usage, Sessions (Langfuse links via `LANGFUSE_PROJECT_URL`) |
| admin | #15 | Actions: ban, Device sessions, Role, removal; sign-in follows `next` |

### Verified

- Backend CI is green on every PR. The full suite has about 348 tests.
- An end-to-end run against the real backend `dev`, on a throwaway Postgres, with the admin app proxying on :3002, passed. It covered:
  - sign-in through the admin proxy, refusal without two-factor, two-factor enrolment, the sign-in challenge, and the gate;
  - a password reset link on the admin origin;
  - the Accounts list and search, and the detail page;
  - ban, with its Audit log entry and the banned sign-in refusal, then unban;
  - an Admin granting an Enrollment, and `/me/allowance.unlimited`.
- **Still pending:** a final end-to-end run that also covers the Profile, Actions, Enrollments, Usage and Sessions UI from #13 to #15, and a visual check in a browser. Nothing has been clicked through in a real browser yet.

### Known gaps and follow-ups

- **Deploy (#8).** Each environment needs:
  - backend: `ADMIN_ORIGIN`;
  - admin: `BACKEND_URL`, optionally `LANGFUSE_PROJECT_URL`, and the `admin.` domain, with Vercel deployment protection on previews.
  Promote the first Admin with `pnpm admin:promote <email>`; that Account must have signed up in the web app first.
  Then check, on staging, that a password reset requested from the admin app links to the admin domain. Vercel's rewrite headers, and Railway's handling of `x-forwarded-host`, are unconfirmed. If they don't pass the host through, links fall back to the web origin, which is safe.
- **Streamed redirects.** With Cache Components, the gate's redirect for a refused visitor is streamed (HTTP 200 plus a meta refresh), not a 307. No gated content renders. Unknown `/accounts/<id>` renders "not found" with 200.
- **Bare sign-in redirect.** `proxy.ts` redirects to `/sign-in` without `next`. Only "Sign in again" sets it.
- **Impersonation.** Deferred, as decided. If it comes back, do it as a hand-off to the student app with Better Auth's one-time-token plugin.

## Milestone 2: Catalog and content. Not started

Decided in the design interview. Recorded in backend ADR 0004 (dashboard owns the Catalog) and ADR 0005 (stable
ids, versioned content), agent ADR 0008 (content location from the backend) and ADR 0009 (lesson-plan JSON
Schema), web ADR 0005 (Chapter-id URLs, draft preview), and the "Catalog and content" section of the plan. It
changes contracts in **all four repos**. Ship it as one coordinated release: backend expand migration, then the
agent (with fallback), the web, the admin app, and finally the backend contract migration.

### Requirements by area

**1. Identity (backend, migration in expand/contract steps)**
- **Course:**
  - Add a UUID `id` that is never reused, plus an editable `slug` that is unique among non-Archived Courses.
  - Existing slug ids become `slug` values, so today's URLs keep working.
- **Chapter:**
  - Add a UUID `id`. `number` becomes an editable position.
  - The old key `(course_id, number)` goes away.
- **References:** `enrollment.course_id` and `study_session.course_id` move to the Course UUID.
- **Session record:** `study_session` gets `chapter_id` and `content_version_id` (restrict foreign keys) and drops `chapter_number` after a backfill.
- **Safety:** every migration must keep the currently deployed code working (backend AGENTS.md rule).

**2. States and rules (backend)**
- **Course status: Draft / Published / Archived.**
  - Draft is hidden from the Catalog and visible to Admins.
  - Archived is hidden from the Catalog with no new Enrollments. Existing Enrollments continue.
- **Chapter state: Draft / Coming soon / Published / Archived.** This replaces the `published` boolean.
- **Numbering.** A number is unique only among a Course's Coming soon and Published Chapters, so a Draft may share it. Reordering is atomic.
- **Chapter replacement.** It publishes a Draft and archives the old Chapter in one transaction.
- **Deletion.** Hard delete only for a Course or Chapter with no Enrollments and no Sessions, ever. Otherwise, archive.
- **Visibility.** The public Catalog endpoints show only Published Courses, and Coming soon or Published Chapters. They stay publicly cached.

**3. Content versions (backend + Bunny)**
- **What a version is.** Every upload is an immutable Content version under `courses/{courseId}/chapters/{chapterId}/v{n}/`, with its prefix stored in its row.
- **Course-level files.** `01_Course_Knowledge_Schema.md` and `cast.json` are versioned separately as a Course content version.
- **Live pointer.** A Chapter and a Course each point at one live version. Setting a version live, and rolling back, move the pointer. `lesson_count` is read from the live `lessons_list.json`.
- **Retention.** Versions are kept forever. Delete only one that was never live and has no Sessions, and delete its Bunny files with it.
- **Existing content.** `becan-test`'s `ch_1` is registered as version 1 at its current path, so no files move.
- **Credentials.** The backend holds the Bunny write key (new env vars). The admin app never talks to Bunny.

**4. Uploads and validation**
- **Upload unit.** Upload a whole Chapter folder or zip, all or nothing. Course files are uploaded on their own.
- **Validation.**
  - The agent repo owns a JSON Schema for `lessons_list.json` and the v2 lesson plan, kept in agreement with `parse_plan` by a CI fixture test.
  - The backend keeps a copy and adds cross-field checks: slugs match files, sequences are contiguous, misconceptions match triggers, `total_topics` is right.
  - The validation report is shown in the admin app.
- **Gate.** Passing validation is required to go live. A preview is encouraged: the version page shows "Not previewed yet" until an Admin has had an Admin Session on it.
- **Check first.** Find out whether uploads larger than 4.5 MB pass the Vercel rewrite. If not, use a short-lived upload token so the browser posts directly to the backend.

**5. Agent (contract)**
- New participant attributes: `content_path`, `course_content_path`, `chapter_number` and `chapter_title`. No existing name is renamed.
- `course_id` and `chapter_id` carry UUIDs.
- The agent reads from the paths it is given, and ignores `chapter` and `chapter_number` inside `lessons_list.json`.
- It falls back to `courses/{course_id}/{chapter_id}/` when `content_path` is missing, so deploy order doesn't matter.
- Langfuse trace metadata adds the Course, Chapter and content paths.

**6. Web (contract)**
- Session URLs become `/session/{courseSlug}/{chapterId}`. The token request sends `chapterId`.
- The web reads `lessons_list.json` and `slides.pdf` from the backend-provided `content_path`, and stops building `ch_{n}` paths.
- Admins see Draft Courses and unpublished Chapters, marked as such, from an uncached Admin-only backend path, and can start them without an Enrollment.

**7. Admin app**
- **Catalog pages:**
  - Institutions and Majors: create and edit, never delete, with Arabic and English names.
  - Courses: list, create (slug is editable; the UUID is fixed), edit, status changes, delete when allowed.
  - Chapters: list, drag to reorder, state changes, replacement.
  - Content versions: upload, validation report, set live, rollback, "preview in student app" link, preview status.
  - Course content versions.
- Audit every Catalog and content write, with `targetType` `course`, `chapter` or `content-version`.

**8. Seed and cross-repo docs**
- `seedCatalog` and `seedInstitutions` switch to inserting only missing rows (`ON CONFLICT DO NOTHING`). Plans stay seed-managed.
- Update `docs/agent-contract-*.md` on both sides, `backend-courses-handoff.md`, and the content pipeline spec (drop the `chapter` and `chapter_number` fields).

### Open questions to settle before ticketing Milestone 2

- **Course in Session URLs.** The plan says slug, but a slug can change. Redirect old slugs, or use the UUID?
- **Exact migration sequence.** Lay out the expand and contract steps, and which deploy carries each.
- **Status for a Course without content.** Can a Course be Published without a live Course content version, or with no Published Chapter?
- **Coming soon Chapters.** Do they need a live version?
- **Schema format.** Is the JSON Schema hand-written or generated (for example from pydantic)? Who updates the backend copy, and how is drift caught there?
- **Upload transport.** Through the admin proxy, or a direct upload token. Decide after the 4.5 MB check.
- **Bunny file listing.** Should the admin app list a live version's files?
- **New permission statements.** For example `catalog:*` or `content:*`, or keep the existing `course:*`. Any change updates the access-control contract.
