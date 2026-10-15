# Admin dashboard: state and handoff

Entry point for anyone (person or agent) picking up admin work. The decisions are in
[plans/admin-dashboard-v1.md](plans/admin-dashboard-v1.md) and the ADRs it names. Terms follow the backend
`GLOSSARY.md`. Last updated 2026-10-15 (after the final Milestone 1 end-to-end run).

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
  - admin: `BACKEND_URL`, optionally `LANGFUSE_PROJECT_URL`, and the `admin.` domain, with Vercel deployment protection on previews.
  Promote the first Admin with `pnpm admin:promote <email>`; that Account must have signed up in the web app first.
  Then check, on staging, that a password reset requested from the admin app links to the admin domain. Vercel's rewrite headers, and Railway's handling of `x-forwarded-host`, are unconfirmed. If they don't pass the host through, links fall back to the web origin, which is safe.
- **Streamed redirects.** With Cache Components, the gate's redirect for a refused visitor is streamed (HTTP 200 plus a meta refresh), not a 307. No gated content renders. Unknown `/accounts/<id>` renders "not found" with 200.
- **A Session already running is not ended by a ban.** Since backend #37 a banned or revoked Student cannot get a new
  token, but a LiveKit room they are already in runs to its granted length (at most the Plan's longest Session). Ending
  it would need the backend to remove the participant through the LiveKit server API. Not built.
- **Bare sign-in redirect.** `proxy.ts` redirects to `/sign-in` without `next`. Only "Sign in again" sets it.
- **Impersonation.** Deferred, as decided. If it comes back, do it as a hand-off to the student app with Better Auth's one-time-token plugin.

## Milestone 2: Catalog and content. Decided, not yet ticketed

Decided in the design interview. Recorded in backend ADR 0004 (dashboard owns the Catalog) and ADR 0005 (stable
ids, versioned content), agent ADR 0008 (content location from the backend) and ADR 0009 (lesson-plan JSON
Schema), web ADR 0005 (Chapter-id URLs, draft preview), and the "Catalog and content" section of the plan. It
changes contracts in **all four repos**. It ships as one release in a short **maintenance window**: backend, agent,
web and admin deploy together (decided 2026-10-15, see "Decisions" below). This replaces the expand/contract plan.

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
- **Safety:** this one migration may break the deployed code, because it ships in the maintenance window. The backend
  AGENTS.md rule (every migration keeps the deployed code working) applies again from the next one.

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
- **Transport.** The browser posts the upload straight to the backend origin with a short-lived, single-use upload token that the admin app gets through the proxy. Vercel's 4.5 MB limit never applies.

**5. Agent (contract)**
- New participant attributes: `content_path`, `course_content_path`, `chapter_number` and `chapter_title`. No existing name is renamed.
- `course_id` and `chapter_id` carry UUIDs.
- The agent reads from the paths it is given, and ignores `chapter` and `chapter_number` inside `lessons_list.json`.
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

### Decisions (2026-10-15)

These settle the open questions from the design interview.

- **Release: one maintenance window, no expand/contract.** There is no production traffic that needs zero downtime
  yet. One backend migration rewrites the keys in place (Course slug to UUID, the references in `enrollment` and
  `study_session`, Chapter `(course_id, number)` to UUID). Backend, agent, web and admin deploy together, staging
  first. So the agent has **no fallback** to `courses/{course_id}/{chapter_id}/`. Backend ADR 0005 and agent ADR 0008
  are amended to match in their tickets.
- **Course in Session URLs: the slug, but the Chapter id decides.** `/session/{courseSlug}/{chapterId}` resolves by
  `chapterId` alone, which already implies the Course. A stale slug redirects to the current one. There is no table of
  old slugs. Course pages that use an old slug answer not found.
- **What must exist before something is shown.**
  - A Coming soon Chapter needs no content.
  - A Published Chapter needs a live Chapter content version **and** a live Course content version for its Course.
  - A Course can be Published with only Coming soon Chapters, like today's nine display Courses.
  - The backend refuses a state change that breaks these rules. Setting a version live never changes a state.
- **Schema: hand-written.** `parse_plan` is hand-written checks, not pydantic, so the agent repo writes the JSON Schema
  by hand, next to shared valid and invalid fixtures. The backend copies the schema **and** the fixtures, and its tests
  run them through its validator. A schema change in the agent is a lockstep change: copy both to the backend.
- **Upload transport: a direct upload token.** The admin app asks `POST /api/v1/admin/.../upload-token` through the
  proxy, then the browser posts the zip straight to the backend origin with that token. CORS on that one route allows
  `ADMIN_ORIGIN`. The token is short-lived and single-use, and it names the Chapter or Course it uploads to.
- **File listing: from the database.** At upload the backend stores each version's manifest (path, size, SHA-256). The
  admin app shows that list and never calls Bunny's listing API.
- **Permissions: keep `course:*`.** Institutions, Majors, Courses, Chapters and content all use the existing
  `course: create/read/update/delete/publish` statements. There is one Admin Role, so finer statements would gain
  nothing and would change the access-control contract.

### Tickets (proposed)

Each ticket updates its own repo's docs, glossary and contract files. The Milestone 2 tracking issue lives in this repo.

| # | Repo | Ticket | Needs |
|---|---|---|---|
| A1 | agent | JSON Schema for `lessons_list.json` and the v2 plan, shared fixtures, CI test that the schema and `parse_plan` agree | none |
| B1 | backend | Identity and versions migration: Course UUID, `slug`, `status`; Chapter UUID, `state`, partial-unique `number`; Chapter and Course content version tables, live pointers, manifests; `enrollment` and `study_session` rewritten to UUIDs; `study_session.chapter_id` and `content_version_id`; `becan-test` `ch_1` and its Course files registered as version 1 in place; the seed inserts only missing rows; the public Catalog shows only Published Courses and Coming soon or Published Chapters; token issuance takes `chapterId`, pins the live versions and sets `content_path`, `course_content_path`, `chapter_number` and `chapter_title`; the Account Sessions read shows the Chapter | none |
| A2 | agent | Read content from `content_path` and `course_content_path`; say `chapter_number` and `chapter_title`; ignore the Chapter fields in `lessons_list.json`; add the Langfuse metadata; amend ADR 0008 | B1 contract |
| W1 | web | `/session/{courseSlug}/{chapterId}` with the stale-slug redirect; token request with `chapterId`; `lessons_list.json` and `slides.pdf` from `content_path`; Coming soon Chapters in the Catalog | B1 contract |
| B2 | backend | Admin Catalog API: Institutions and Majors (create, edit); Courses (create, edit, slug, status, delete when allowed); Chapters (create, edit, atomic reorder, states, replacement, delete when allowed); the publish rules above; audited with `targetType` `course` and `chapter` | B1 |
| B3 | backend | Content versions API: upload token, zip ingest to Bunny (all or nothing), validation report (the schema copy plus cross-field checks), manifest, set live, rollback, delete when allowed, Course content versions; Bunny write env vars; audited with `targetType` `content-version` | B1, A1 |
| B4 | backend | Admin preview: an uncached Admin-only Catalog read (Draft Courses, every Chapter and its versions); an Admin Session may pin any validated version (`contentVersionId`); an Admin Session marks that version previewed | B1 |
| W2 | web | Draft preview for Admins: Draft Courses and unpublished Chapters, marked; start without an Enrollment; the "preview this version" link target | B4, W1 |
| AD1 | admin | Catalog navigation, Institutions and Majors pages (#22, PR open) | B2 (merged, backend #43) |
| AD2 | admin | Courses list, create, edit, status changes, delete (#23, PR open) | B2 (merged, backend #43 and #45) |
| AD3 | admin | Chapters list, drag to reorder, state changes, replacement | B2 |
| AD4 | admin | Content versions and Course content versions: upload with the token, validation report, file list, set live, rollback, delete, preview link and status | B3, B4 |
| R1 | admin (tracking) | Release runbook: the maintenance window order, Bunny env vars, staging run, then production; check token issuance and a full Session on staging | everything |

**Order.** A1 and B1 start now and run in parallel. B1, A2 and W1 break the contract between them, so they merge into
`dev` back to back, B1 first. B2, B3 and B4 follow B1. The admin pages follow their APIs. Nothing deploys until R1.
