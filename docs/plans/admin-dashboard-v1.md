# Admin dashboard v1: agreed decisions

Agreed in a design interview on 2026-10-15. Terms follow the backend `GLOSSARY.md`. Decisions that are hard
to reverse are ADRs: admin 0001 and backend 0002 and 0003.

> **2026-10-25: the "Catalog and content" section and Milestone 2 below were dropped.** The Catalog is managed
> by hand with SQL (backend ADR 0007), so this dashboard keeps only Account management (Milestone 1). The
> dropped parts are kept below as history. An Insights home page is planned next.

## Stack

- Next.js 16.4 (React 19.3; `proxy.ts`; Cache Components are on by default, so read cookies inside
  Suspense boundaries).
- shadcn CLI v4 on Tailwind 4, initialised with `-b radix`. Start from `dashboard-01`, the sidebar
  blocks, and a data table on TanStack Table v9 with server-side paging.
- Better Auth client with `adminClient({ ac, roles })` and `twoFactorClient`.
- Better Auth UI is used for the auth screens only: sign-in, 2FA setup and challenge, account settings.
  The Accounts area is built by us.
- English, LTR UI through next-intl, with only `en` messages for now. Every content field and preview
  uses `dir="auto"` or RTL.
- Toolchain matches the student web app: pnpm, Node 24.12, Vitest, and lint → type-check → build.
  The repo gets a first commit on `main`, and work happens on `dev`.
- Hosting: a separate Vercel project on an `admin.` subdomain. Production uses the production backend
  and staging uses the staging backend. The app is noindex, and preview deploys sit behind Vercel's
  deployment protection.

## Auth and Roles (backend)

- Better Auth `admin()` plugin, with access control built by `createAccessControl`:
  - Statements: the plugin's default `user:*` and `session:*`, plus `course:*` and `tutor:["unlimited"]`.
  - Roles: `user` (a Student) and `admin`.
  - Code checks permissions, never role names.
  - The permissions module is a contract between the backend and the admin app.
- `auth-schema.ts` is edited by hand to add `role`, `banned`, `banReason`, `banExpires` and
  `session.impersonatedBy`.
- `twoFactor` (TOTP) is installed. Admin routes, and the Admin Session grant, require the permission
  **and** 2FA turned on for the Account. That check is ours, because the plugin can't require 2FA for one
  Role.
- The first Admin is created with `npx auth create-admin`, if it can supply our required fields; otherwise
  a one-off script does it. Later Admins are promoted from the dashboard with `setRole`. Admins sign up
  like Students.
- `freshAge` re-authentication is required before Account removal and Role changes, through our own
  check, since the admin plugin endpoints don't use `freshSessionMiddleware`.
- Origins:
  - Better Auth gets a dynamic `baseURL` with `allowedHosts: [web, admin]`.
  - CORS takes a list of origins.
  - Each app proxies `/api/auth` and `/api/v1` through its own origin.
- Token issuance, admin routes and anywhere Admin privileges are granted read the session with the cookie
  cache disabled.
- `impersonateUser` is **deferred**. It will come later as a hand-off to the student app using the
  one-time-token plugin.
- The student app maps the `BANNED_USER` error code to its own Arabic and English messages.

## Admin Sessions

- An Admin Session needs `tutor:unlimited`. It needs no Enrollment, can open Draft Courses and
  unpublished Chapters, is not bound by an Allowance. It is still
  recorded, and excluded from Usage.
- It gets `session_seconds` = 10800 (3 hours) with `session_limit=session`. The one-open-Session rule
  still applies.
- The student app shows Admins the Draft and unpublished items, marked as such, from an Admin-only path
  that isn't cached.

## Audit log

- An `admin_audit_log` table in our own Postgres. It records the actor, action, target, before and after
  values, and the time.
- It is written from Better Auth `hooks.after` on `/admin/*` and from our admin routes.
- An Account removal keeps only the Account id, the actor, the time and the reason.

## Accounts

- **Search and filter:** `listUsers` with search by email or name, and filters for Role, Institution,
  Major and ban status.
- **Edit:** name, phone, Institution and Major.
- **Email:** an Admin can set a new email, which becomes unverified and sends a verification email. An
  Admin can also mark an email verified by hand.
- **Passwords:** an Admin can send a password-reset email, but never sets a password.
- **Ban:** with an optional expiry. It revokes the Account's Device sessions.
- **Removal:** a hard delete, which requires a fresh session and a typed confirmation. The dialog warns
  that Langfuse traces remain.
- **Enrollments:** an Admin can grant or revoke them. Grants follow the Student's Plan slot limit.
- **Detail page sections:** Profile, Enrollments, Plan and Usage, Sessions (with Langfuse links), and Device sessions.
- **Not in v1:** creating Accounts, bonus minutes and Plan changes, an Overview page with charts,
  feedback reports, and managing prompts (prompts stay in Langfuse).

## Catalog and content (DROPPED 2026-10-25, history only)

> Not built, and the code that was merged was reverted. The Catalog is managed by hand with SQL (backend
> ADR 0007): Course id stays the slug, a Chapter is a Course plus a number, and each Chapter has one content
> folder on Bunny. Nothing below applies.

- **Source of truth:** the dashboard owns the Catalog, Institutions and Majors. The seed only inserts rows
  that are missing; Plans stay seed-managed.
- **Institutions and Majors:** create and edit, never delete.
- **Courses:**
  - A UUID `id`, plus an editable `slug` that is unique among non-Archived Courses.
  - Status is Draft, Published or Archived. Archiving keeps existing Enrollments.
  - Hard delete only for a Course with no Enrollments and no Sessions.
- **Chapters:**
  - A UUID `id` and an editable `number`, unique among Coming soon and Published Chapters.
  - States are Draft, Coming soon, Published and Archived.
  - Admins reorder by drag. Chapter replacement swaps the old and new Chapter in one transaction.
  - Hard delete only for a Chapter with no Sessions.
- **Content versions:**
  - Upload a whole Chapter folder or zip, all or nothing. Course files are uploaded separately as a
    Course content version.
  - The backend holds the Bunny key and writes to `courses/{courseId}/chapters/{chapterId}/v{n}/`.
  - Validation uses the agent-owned JSON Schema plus cross-field checks in TypeScript. A version must pass
    to go live.
  - Preview is encouraged, and the version page shows "Not previewed yet" until an Admin has had an Admin
    Session on it.
  - Setting a version live, and rolling back, move a pointer.
  - Versions are kept forever. Only a version that was never live and has no Sessions can be deleted.
- **What the agent receives:** token issuance pins both live versions and passes `content_path`,
  `course_content_path`, `chapter_number` and `chapter_title`. `study_session` stores `chapter_id` and
  `content_version_id`.
- **To check first:** whether uploads larger than 4.5 MB pass through the Vercel rewrite. If they don't,
  use a short-lived upload token so the browser posts directly to the backend.

## Dashboard pages

- **Accounts**, with a detail page for each Account.
- **Audit log.**
- **My account:** profile, 2FA, Device sessions.

## Milestones

1. **Admin basics.** Repos: backend, admin, and the web app for the banned message only.
   - Admin plugin, access control and 2FA.
   - Origins and dynamic `baseURL`.
   - Uncached session reads.
   - Audit log.
   - Accounts pages, Enrollments and Usage views.
   - Admin Sessions on existing published Chapters.
2. **Catalog and content. DROPPED 2026-10-25 (history only).** Repos: backend, agent, web and admin, released in the order backend
   migration (expand, then contract), agent with fallback, web, admin.
   - Identity and versioning migration, Course status and Chapter states.
   - Uploads and validation.
   - Draft preview in the student app.
   - The seed switch.
   - Update `docs/agent-contract-*.md` on both sides.
