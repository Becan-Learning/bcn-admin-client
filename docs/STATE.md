# Admin dashboard: state and handoff

Entry point for anyone (person or agent) picking up admin work. The decisions are in
[plans/admin-dashboard-v1.md](plans/admin-dashboard-v1.md) and the ADRs it names. Terms follow the backend
`GLOSSARY.md`. Last updated 2026-10-15 (Milestone 2 code complete; the release runbook is written).

**Next step: the release.** Milestones 1 and 2 ship together in one maintenance window, staging first. Follow
[release-m2-runbook.md](release-m2-runbook.md) (tracking: #26, which also covers the Milestone 1 deploy, #8).

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
  Then check, on staging, that a password reset requested from the admin app links to the admin domain. Vercel's rewrite headers, and Render's handling of `x-forwarded-host`, are unconfirmed. If they don't pass the host through, links fall back to the web origin, which is safe.
- **Streamed redirects.** With Cache Components, the gate's redirect for a refused visitor is streamed (HTTP 200 plus a meta refresh), not a 307. No gated content renders. Unknown `/accounts/<id>` renders "not found" with 200.
- **A Session already running is not ended by a ban.** Since backend #37 a banned or revoked Student cannot get a new
  token, but a LiveKit room they are already in runs to its granted length (at most the Plan's longest Session). Ending
  it would need the backend to remove the participant through the LiveKit server API. Not built.
- **Bare sign-in redirect.** `proxy.ts` redirects to `/sign-in` without `next`. Only "Sign in again" sets it.
- **Impersonation.** Deferred, as decided. If it comes back, do it as a hand-off to the student app with Better Auth's one-time-token plugin.

## Milestone 2: Catalog and content. Code complete, not yet deployed

Decided in the design interview. Recorded in backend ADR 0004 (dashboard owns the Catalog) and ADR 0005 (stable
ids, versioned content), agent ADR 0008 (content location from the backend) and ADR 0009 (lesson-plan JSON
Schema), web ADR 0005 (Chapter-id URLs, draft preview), and the "Catalog and content" section of the plan. It
changes contracts in **all four repos**. It ships as one release in a short **maintenance window**: backend, agent,
web and admin deploy together (decided 2026-10-15, see "Decisions" below). This replaces the expand/contract plan.

Tracking issue: #21. Every code ticket is merged into `dev`. Only the release remains (R1, #26): see
[release-m2-runbook.md](release-m2-runbook.md). Nothing was run end to end across the four repos locally; the
staging checks in the runbook are that run.

### What shipped

| Ticket | Repo | PR | What |
|---|---|---|---|
| A1 | agent | #45 | `schemas/`: JSON Schema for `lessons_list.json`, the v2 lesson plan and `cast.json`, with shared fixtures (valid Chapters, plus `invalid-schema` and `invalid-cross-field` cases as base-plus-patch) and a test that keeps them in agreement with `parse_plan` |
| B1 | backend | #42 | The identity and versions migration (Course and Chapter UUIDs, `slug`, Course status, Chapter state, Content version tables, live pointers, `becan-test` registered as version 1 in place); insert-only seed; the public Catalog by state; token by `chapterId`, pinning both versions, with the four new attributes |
| A2 | agent | #46 | Content read from `content_path` and `course_content_path`, with no fallback; Chapter number and title from the attributes; Langfuse trace metadata |
| W1 | web | #56 | `/session/{courseSlug}/{chapterId}`, content from the pinned `contentPath`, no more `ch_{n}` paths |
| B2 | backend | #43 | Admin Catalog API: Institutions, Majors, Courses, Chapters, reorder, replacement, publish rules, deletes, audited |
| B5 | backend | #45 | `GET /chapters/:id`; Archived Courses by slug for their enrolled Students; Course `status` on reads |
| W3 | web | #58 | Session pages resolve with one read; enrolled Students keep Archived Courses |
| B3 | backend | #46 | Content versions: upload token, direct upload, all-or-nothing Bunny writes, validation (the agent schema copy plus TypeScript cross-field rules pinned by the agent fixtures), set live, rollback, delete |
| B4 | backend | #47 | Admin preview reads (Draft Courses, every version) and version pinning for Admin Sessions |
| W2 | web | #59 | Draft and version preview for Admins, uncached and marked; the preview URL `?version=&courseVersion=` |
| AD1 | admin | #27 | Catalog navigation, Institutions and Majors |
| AD2 | admin | #28 | Courses list and detail: edit, status, delete |
| AD3 | admin | #29 | Chapters: reorder, states, replacement, delete; the Chapter page |
| AD4 | admin | #30 | Content versions and Course content versions: upload with progress, report, files, set live, rollback, delete, preview link |

New environment variables (all in the runbook): backend `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_HOST`,
`BUNNY_STORAGE_KEY`, `PUBLIC_API_ORIGIN`, optional `CONTENT_UPLOAD_MAX_BYTES`; admin optional `STUDENT_APP_URL`.

### Known gaps and follow-ups

- **Slug shared with an Archived Course.** `/c/{slug}` shows the non-Archived Course, so an Archived Course's
  "back to the Course" link can land on the other one.
- **Course content version preview.** Course versions show a preview status, but only Chapter versions have a
  preview link. To preview a Course version, use the student app's `courseVersion` parameter by hand.
- **Code-less 400s.** The backend's body-validation errors carry no `code`; the admin app shows them as
  `INVALID_REQUEST`.
- **Agent tests.** `tests/test_units_plan_v3.py` has 5 failures on `dev` from content drift, unrelated to Milestone 2.
  The agent repo has no CI.

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

### Tickets

All are merged, apart from R1 (#26, the release). The table above lists their PRs; the decisions that
shaped them are in "Decisions" above.
