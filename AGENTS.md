# Repository guidance

The Becan admin dashboard: where Admins manage Accounts, the Catalog and Course content. It is a
**client of the backend** with no database or secrets (`docs/adr/0001-*`). Role checks here only
decide what to render; the backend re-checks every call.

## Commands and toolchain

- Use pnpm and the Node version in `.nvmrc` (`v24.12.0`). Non-interactive shells fall back to system
  Node 18, so initialise NVM and pnpm in **every** shell invocation, then run the command:

  ```bash
  export NVM_DIR="$HOME/.nvm"
  source "$NVM_DIR/nvm.sh" --no-use &&
    nvm use --silent 24 &&
    export PNPM_HOME="${PNPM_HOME:-$HOME/.local/share/pnpm}" &&
    export PATH="$PNPM_HOME/bin:$PATH" &&
    pnpm lint
  ```

- `pnpm dev` serves on **port 3002** (the backend's `ADMIN_ORIGIN` is `http://localhost:3002`).
  `pnpm build`, `pnpm start`.
- Verify in this order before calling work done: `pnpm lint`, then `pnpm type-check`, then
  `pnpm build`. Tests: `pnpm test` (`vitest run`); one file: `pnpm test tests/<file>.test.ts`.
- `BACKEND_URL` (see `.env.example`) defaults to `http://localhost:3000` in dev. In production the
  app throws at startup when it is unset.
- New packages whose install scripts are not approved fail `pnpm add`: list them in
  `pnpm-workspace.yaml` under `allowBuilds` (we set the ones we do not need to `false`).

## Stack

Next.js 16 (App Router, `src/`, Cache Components on), React 19, TypeScript strict, Tailwind 4,
shadcn (CLI v4, `radix-vega` style, neutral, `components.json`), next-intl, Better Auth client, zod,
Vitest. Read the guide in `node_modules/next/dist/docs/` before Next-specific code.

- **The student web app's design rules do not apply here.** No Becan-branded tokens, no Arabic-first
  RTL layout, no page patterns. This is a plain shadcn neutral look, light and dark, LTR.
- **Interface text** lives in `messages/en.json` (English only, no locale prefix). Never hard-code
  visible text in components. Show Better Auth errors through `Errors.<CODE>` in that file
  (`src/lib/auth/errors.ts`), never the backend's own text.
- **Arabic content** (names, titles) can appear anywhere. Inputs and textareas that take user content get
  `dir="auto"`, so typing Arabic right-aligns. Display text (headings, cells, labels, notices) does **not**:
  `dir="auto"` on a block right-aligns an Arabic value in this LTR page. Keep the block LTR and isolate the
  value inline with `<bdi>`, so it lines up with the rest of the page but still renders RTL. For a truncated
  line use `<span className="truncate"><bdi>…</bdi></span>`.
- Add shadcn components with `pnpm dlx shadcn@latest add <name>`.
- The auth screens are our own (`src/components/auth/`), built from shadcn blocks and `authClient`.
  Better Auth UI was evaluated and not used: it brings its own provider, TanStack Query and
  localization, which clash with next-intl and the forced-setup flow.

## Proxy and gate

- `next.config.ts` rewrites `/api/auth/:path*` and `/api/v1/:path*` to `BACKEND_URL`, so cookies stay
  first-party and host-only. Signing in here does not sign you in to the student app. Browser code
  calls the same origin; server code calls `backendUrl()` and forwards only `cookie` and
  `x-forwarded-for` (`src/lib/auth/forwarded-headers.ts`).
- `src/proxy.ts` is only an optimistic check: no session cookie means a redirect to `/sign-in`.
  `/sign-in` and `/two-factor` are public (the challenge runs before the session cookie exists).
- The real check is server-side. `src/lib/auth/session.ts` fetches
  `get-session?disableCookieCache=true` with the incoming cookie and validates it with zod.
  `adminGate(session)` in `src/lib/auth/gate.ts` is a pure function returning `"sign-in" |
  "no-access" | "setup-two-factor" | "ok"`; it decides from `user.role` through the copied `roles`
  (permission `user: ["list"]`), never `role === "admin"`. `requireGate(expected)` in `guard.ts`
  redirects to the page for the visitor's state. `(dashboard)/layout.tsx` requires `"ok"`;
  `/no-access` and `/setup-two-factor` require their own state.
- Request-time reads (cookies, the session) must sit inside `<Suspense>`: Cache Components is on.
- Everything is noindex: `robots` metadata plus an `X-Robots-Tag` header in `next.config.ts`.
- There is no sign-up page and no "trust this device" option.

## Accounts list

- `/accounts` is a server component: inside `<Suspense>` it reads `searchParams` and the request headers,
  fetches `GET /api/v1/admin/accounts` (backend `AGENTS.md`, "Admin Accounts list") with the forwarded
  cookie, and hands the result to the client `AccountsView`. The URL is the only table state
  (`src/lib/accounts/query-state.ts`, pure and tested); filters, sort and paging are navigations that
  re-run the fetch. Expected failures return an error key shown through `Errors.<CODE>`, never raw
  backend text. Follow this pattern for the other lists.
- The table is TanStack Table v9 (`useTable`, manual sorting and paging, `rowCount` from the backend).

## Account detail

- `/accounts/[id]` is a server component: inside `<Suspense>` it fetches Better Auth's `admin/get-user` and the
  public Institutions (`fetchAccountProfile`, `fetchInstitutions`), then renders `AccountHeader` and one
  component per section, all in `src/components/accounts/detail/`. The header shows the name (in a `<bdi>`),
  email, Role, banned and two-factor badges.
- **Sections are slots.** `ProfileSection` is built. `AccountActionsSection` (#5: ban, Device sessions, Role,
  removal), `EnrollmentsSection`, `PlanUsageSection` and `SessionsSection` (#6) are files that return `null`;
  the page already renders them, so a later issue fills in its own file and never edits the page. A section may
  be an async server component (own fetch, own `<Suspense>`) with client children. Reuse `ConfirmDialog` and
  `useAccountAction` (pending, error key, success line, then `router.refresh()`).
- **Profile.** Name, phone, Institution and Major go through `authClient.admin.updateUser` with only the changed
  fields (`diffProfile`, `src/lib/accounts/profile-form.ts`, pure and tested; a new Institution always sends its
  Major). Backend codes land on their field (`INVALID_PHONE_NUMBER`, `PHONE_NUMBER_TAKEN`, `INVALID_INSTITUTION`,
  `INVALID_MAJOR`, and `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` for the email field), shown through `Errors`.
- **Email.** Changing it asks for confirmation first: the backend makes the new address unverified and sends the
  verification email to it, on the web origin. "Mark email verified" is `updateUser({ emailVerified: true })`.
  "Resend verification email" and "Send password-reset email" call `POST /api/v1/admin/accounts/:id/
  verification-email` and `/password-reset` (backend "Admin emails"). There is no way to set a password in this
  UI and there must not be one.
- **Actions** (`AccountActionsSection`, an async Server Component that reads the viewer's session for `isSelf`).
  Four client cards, all through `authClient.admin.*` and `src/lib/accounts/account-actions.ts`: `BanCard` (`banUser`
  with `banExpiresIn` in seconds, `unbanUser`), `AccountDeviceSessionsCard` (`listUserSessions`, `revokeUserSession`,
  `revokeUserSessions`; the session token is only used to revoke and is never rendered), `RoleCard` (`setRole`
  `"user" | "admin"`) and `RemoveAccountCard` (`removeUser`, after typing the email; it goes to `/accounts` without a
  refresh). Pure rules (expiry to seconds, typed-email match, error mapping) are in `src/lib/accounts/account-safety.ts`.
  Viewing your own Account disables ban, Role change and removal (the backend also answers 403 `ADMIN_SELF_TARGET`).
- **Fresh session.** `set-role` and `remove-user` answer 403 `FRESH_SESSION_REQUIRED` when the Device session is older
  than ten minutes. The dialog then shows `SignInAgainButton`: sign out, then `/sign-in?next=/accounts/<id>`. The
  sign-in and two-factor forms follow `next` through `src/lib/auth/return-path.ts` (`safeReturnPath` accepts only a
  path on this app), and the two-factor redirect in `client.ts` carries it across the challenge.

- **Enrollments, Plan and Usage, Sessions** (#6) are three independent sections, each with its own `<Suspense>`
  and its own error alert, so one failing read never breaks the page. Their server reads are in
  `src/lib/accounts/fetch-detail.ts` (`GET /api/v1/admin/accounts/:id/enrollments`, `/allowance`, `/sessions`,
  and the public Catalog `GET /api/v1/courses` for the Course picker), with the forwarded cookie. Grant (`PUT`)
  and End (`DELETE`) run in the browser through `enrollment-actions.ts`, then `router.refresh()`. Grant follows
  the Student's Plan slot limit: 409 `ENROLLMENT_LIMIT_REACHED` is shown through `Errors`. Usage minutes round
  like the student app (used up, limit down); the pure helpers are in `usage.ts`, `enrollment-picker.ts` and
  `sessions-page.ts` (all tested). The Sessions page is server-paged (10 a page) in the `sessionsPage` search
  param, which the page passes down to `SessionsSection`.
- **`LANGFUSE_PROJECT_URL`** (server-only, optional, see `.env.example`): the Langfuse project URL, for example
  `https://cloud.langfuse.com/project/<id>`. Each Session links to `${LANGFUSE_PROJECT_URL}/sessions/<room>`
  (`langfuseSessionUrl`, the room is `ss_<study_session.id>`; Langfuse groups an agent Session's traces by room
  name). Unset or not an http(s) URL: no link. It is read at request time, so it needs no `NEXT_PUBLIC_` prefix.

## Catalog

The Catalog area is `/catalog/*`; AD1 (#22) built Institutions and Majors, AD2 (#23) Courses, AD3 (#24) Chapters and AD4
(#25) Content versions. Follow these patterns so the pages stay alike. The routes are the backend's Admin
Catalog API (`/api/v1/admin/...`, backend `AGENTS.md`, "Admin Catalog API"); permissions are `course:*`.

- **Navigation.** `AppSidebar` (`src/components/shell/app-sidebar.tsx`) has a `NAV_ITEMS` entry with `children`
  for sections: "Catalog" opens its first child and lists its children (always expanded, hidden when the sidebar
  is collapsed to icons). Add a sub-page by adding a child there and its label under `Nav` in `messages/en.json`.
  `/catalog` only redirects to `/catalog/institutions`.
- **Reads** (`src/lib/catalog/fetch.ts`, `server-only`): the page is a server component and its fetch sits in a
  component inside `<Suspense>`, with the request headers forwarded (`forwardedHeaders`). The result is
  `{ ok: true, ... } | { ok: false, errorKey }`, never a throw. The client view draws it, including an error
  panel with "Try again" (`router.refresh()`). Response shapes are zod schemas in `src/lib/catalog/types.ts`
  (unknown fields dropped). The Institutions page makes two reads (Institutions, Majors) and joins them in
  `groupMajors`, which keeps the backend's order.
- **Writes** (`src/lib/catalog/api.ts`): run in the browser against the same-origin `/api/v1/admin/...`, then the
  dialog's `useAccountAction` runs `router.refresh()`. The dialog closes when the write succeeded **and** the
  refresh finished, so the list is already current. Each function returns `{ ok: true }` or
  `{ ok: false, field, errorKey }`. A code that names a field (`catalogFieldForError`: `INSTITUTION_ID_TAKEN` and
  `MAJOR_ID_TAKEN` on the id, `INVALID_INSTITUTION` and `MAJOR_IN_USE` on the Institution, and for Courses `SLUG_TAKEN` on the slug) is shown on that
  field, any other under the form. A 400 from the body check has no `code`: it maps to `INVALID_REQUEST`.
  Every code the backend answers has a message under `Errors`, and `tests/catalog-errors.test.ts` lists them:
  add a new code to both.
- **Forms** are dialogs (`InstitutionDialog`, `MajorDialog`). The form component is mounted only while the dialog
  is open, so each opening starts clean. Shared fields (`entity-fields.tsx`: id, English name, Arabic name,
  sort order) are for any record with that shape. Pure rules are in `src/lib/catalog/form.ts` (`validateForm`,
  `diff*`, `*CreateBody`, `parseSortOrder`) and `slug.ts` (`isValidSlug`, `suggestSlug`), all tested.
  - **Ids are slugs, set once.** Typed on create (suggested from the English name until the Admin edits it, with
    a Major's Institution id in front) and shown read-only on edit. They are never in a PATCH body.
  - **Edits send only the changed fields**; Save is off until something changed. The backend refuses unknown keys
    and an empty body.
  - Arabic inputs are `dir="auto"`. Arabic display text uses `LocalizedName` (English first, Arabic beneath in
    `<bdi>`).
- **No delete anywhere** for Institutions and Majors; the backend has no such route. A Major moves to another
  Institution only while no Account holds it (the select is disabled with a note when `counts.accounts > 0`, and
  `MAJOR_IN_USE` is still handled).
- **Layout.** Pages use `max-w-5xl`. Below `md` the Major table hides the id column and below `sm` the order and
  Account columns, folding them into a muted line under the name, so nothing scrolls sideways at 390 px.
- **Audit log.** Catalog writes are audited by the backend with `targetType` `institution`, `major`, `course` and
  `chapter`. Add each new `action` to `AUDIT_ACTIONS` and its label to `AuditLog.actions`; the labels test fails
  if they drift. All `course.*` and `chapter.*` actions and labels are already there (AD2 added the Chapter ones
  for AD3) and so are the `content-version.*` ones (AD4); a Course target links to its page; field labels for the Chapter fields
  exist too.

### Courses (AD2, #23)

- **List** `/catalog/courses` (server component, `fetchCourses` + `fetchAdminInstitutions`, drawn by `CoursesView`
  in `src/components/catalog/courses/`). Every status; the status filter, the Institution filter and the search
  (`SearchBox`, shared with Accounts) are the URL (`status`, `institution`, `search`; `course-query-state.ts`,
  pure and tested) and go to the backend's `GET /admin/courses?status&institutionId&search`. **Not paged:** the
  backend list is not paged and a Catalog has tens of Courses, so every match is shown in the backend's order
  (Institution, sort order, code). Revisit if the Catalog grows past a few hundred. A row opens the detail page.
  The Institutions feed the filter and the Add dialog; if their read fails the list still renders.
- **Detail** `/catalog/courses/[id]` (UUID). `fetchCourse` gives `counts` and `deletable`; unknown or malformed
  ids are `COURSE_NOT_FOUND` and render `not-found.tsx`. Sections, in `components/catalog/courses/detail/`:
  header (UUID read-only and copyable), `CourseDetailsSection`, `CourseStatusSection`, the slots
  `ChaptersSection` (AD3, built) and `CourseContentVersionsSection` (AD4, built), then `CourseDeleteSection`. **The two slots
  are files that return `null` and take `{ course }`; the page already renders them, so AD3 and AD4 only edit their
  own file.**
- **Details** sends only changed fields (`diffCourse`, `course-form.ts`). The slug is editable; changing it asks for
  confirmation first (Student links change: the old Course page stops resolving, session links with the old slug
  redirect). `icon` and `tone` are selects over the backend's CHECK sets (`COURSE_ICONS`, `COURSE_TONES` in
  `types.ts`, names under `Catalog.courses.icons` and `tones`).
- **Status** moves are `courseStatusMoves` (`course-rules.ts`): any other status, each behind a `ConfirmDialog`
  that says the effect. Back to Draft is disabled while `counts.chapters.published > 0` (the backend answers 409
  `PUBLISH_PRECONDITION`, also shown in the dialog with the way forward); leaving Archived can answer 409
  `SLUG_TAKEN`.
- **Delete** is offered only when the backend says `deletable`, and needs the slug typed. Otherwise one block lists
  why (`deleteBlockers`) and points to Archive. 409 `COURSE_IN_USE` is still handled. On success it goes to the list.
- Creating a Course (`CourseDialog`) makes a Draft and opens its page.

### Chapters (AD3, #24)

- **Section.** `ChaptersSection` (`components/catalog/courses/detail/chapters-section.tsx`) is an async server
  component with its own `<Suspense>` and error alert (`SectionError`, like the Account sections). It reads
  `fetchChapters` (`GET /admin/courses/:id/chapters`, every state) and hands the list to the client `ChaptersCard`
  (`.../detail/chapters/`). The Course page is untouched. A Chapter read carries `liveContentVersionId`, `counts`
  and `deletable`; the Course read carries the Course's `liveContentVersionId`.
- **Groups.** `groupChapters` (`chapter-rules.ts`): Coming soon and Published by number (the numbered list), then
  Drafts, then Archived (collapsed). Only the numbered list is reordered; Drafts and Archived Chapters may share a
  number with a live one. Arabic titles are in `<bdi>`.
- **Reorder.** The Admin arranges the numbered ids locally (`moveToId`, `moveBy`); Save order sends the full list
  once (`PUT /courses/:id/chapters/order`), Reset returns to the server order. Drag is `@dnd-kit` (pointer, and
  keyboard on the handle: Space, arrows, Space); Move up and Move down in the row menu is the touch and keyboard
  alternative. The arrangement is dropped when the server's list changes (`effectiveOrder`). While it is unsaved,
  every other row action waits. A failed save restores the server order and shows the error; 409
  `CHAPTER_ORDER_MISMATCH` also reloads the page data.
- **State moves** are `chapterStateMoves`: any state to any other, each behind a `ConfirmDialog` that says the
  effect. The dialog lists exactly why a move cannot work and keeps confirm off: `numberTaken` (another Coming soon
  or Published Chapter holds the number) and, for Published, `chapterContent` and `courseContent` (from
  `liveContentVersionId` of the Chapter and of the Course; `publishBlockers`). The backend's 409
  `PUBLISH_PRECONDITION` and `CHAPTER_NUMBER_TAKEN` are still handled if the page was stale. Only our own
  `messages/en.json` text is shown, never the backend's.
- **Replace** (Coming soon or Published Chapters only): the dialog lists the Course's Drafts
  (`replacementCandidates`); for a Published Chapter a Draft without live content (or a Course without live content)
  is listed but off with the reason. It names both Chapters: the Draft takes the number and state, the old one is
  archived. Handles `REPLACEMENT_INVALID` and `PUBLISH_PRECONDITION`.
- **Create and edit** (`ChapterDialog`, `chapter-form.ts`): titles, minutes, lesson count, number (blank on create =
  next free). Edits send only the changed fields; `CHAPTER_NUMBER_TAKEN` is shown on the number field
  (`catalogFieldForError`). **Delete** only when `deletable`, behind a confirm; otherwise the row menu says why
  (`chapterDeleteBlockers`) and points to Archive. `CHAPTER_IN_USE` is still handled.
- **Chapter page** `/catalog/chapters/[id]` (`fetchChapter` + `fetchCourse`): header (titles, number, state, Course
  link, UUID) and the slot `ChapterContentVersionsSection` (`components/catalog/chapters/detail/`), which takes `{ chapter, course }`
  and is filled by AD4 (see "Content versions"). Unknown ids render `not-found.tsx`. Audit
  log entries targeting a Chapter link here; the sidebar keeps Courses highlighted on this page.

### Content versions (AD4, #25)

- **Where.** `ChapterContentVersionsSection` (Chapter page) and `CourseContentVersionsSection` (Course page) are the two
  slots; both are thin wrappers over `ContentVersionsSection` (`components/catalog/content/content-versions-data.tsx`), an
  async server component with its own `<Suspense>` and `SectionError`. It reads `fetchContentVersions`
  (`GET /admin/{chapters|courses}/:id/versions`, newest first). **One read carries everything** (report, manifest, preview
  status, `deletable`), so the detail is an expandable row (`VersionRow`), not a sub-page. The client `ContentVersionsCard`
  holds the upload panel, the rows and the dialogs. Types are zod schemas in `lib/content/types.ts`.
- **Upload** (`UploadPanel`, `lib/content/api.ts`, `folder-zip.ts`). Pick a folder (`<input webkitdirectory>`) or a `.zip`,
  then Upload. A folder is zipped in the browser with `fflate` (`planFolder` keeps the relative paths with the picked
  folder as the first segment, which the backend accepts as one wrapping folder; `.DS_Store`, `__MACOSX`, `Thumbs.db` and
  `._*` are left out; PDFs are stored, not deflated). Then: `POST /admin/{...}/upload-token` through the same-origin proxy
  gives `{ token, uploadUrl, expiresAt }`, and the browser POSTs the zip **straight to `uploadUrl`** (the backend's own
  origin, from the token response, so there is no `NEXT_PUBLIC_` var) with `XMLHttpRequest` (only it reports upload
  progress): `Authorization: Bearer <token>`, `Content-Type: application/zip`, no cookies. The token is single use and
  lasts five minutes, so **every attempt, including a retry, asks for a new one**. 201 carries the version even when it
  failed validation (`valid: false` plus a report); the card then opens that row on its report. Cancel aborts the XHR.
- **Errors.** Every code maps to `Errors.<CODE>` (`UPLOAD_TOKEN_*`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_UPLOAD_TYPE`,
  `EMPTY_UPLOAD`, `INVALID_ARCHIVE`, `EMPTY_ARCHIVE`, `UNSAFE_ARCHIVE_PATH`, `TOO_MANY_ENTRIES`, `ARCHIVE_TOO_LARGE`,
  `CONTENT_STORAGE_UNAVAILABLE|FAILED`, `VERSION_INVALID`, `VERSION_IN_USE`, `CONTENT_VERSION_NOT_FOUND`, plus our own
  `FOLDER_UNREADABLE`). On the upload route a 401 is a refused token, not an ended session, so `uploadErrorKey` lets the
  code win over the status; `tests/content-api.test.ts` lists the codes.
- **Report and files.** The validation report is grouped by file (`groupReport`); rule, location and message are the
  validator's own English output, shown as written and labelled so (in `<bdi>`: they can quote lesson text). The file list
  is the manifest (path, human size, `formatBytes`). A version registered in place has `manifest: null` and
  `report: null`: "Registered in place; no upload record."
- **Actions** (`liveAction`, `deleteBlockers`, `needsPreview` in `lib/content/rules.ts`, all tested), each behind a
  `ConfirmDialog`. **Set live** is offered on a valid version that is not live. It is worded **Roll back** when a newer
  version is live. The dialog says new Sessions use it and running Sessions keep theirs, and for a Chapter that the lesson
  count becomes the version's and that the Chapter's state does not change. **Delete** only when `deletable`; otherwise the
  row names why (live, was live, Sessions). 409 `VERSION_INVALID`, 409 `VERSION_IN_USE` and 502 `CONTENT_STORAGE_FAILED`
  are shown in the dialog.
- **Preview** (Chapter versions only). **`STUDENT_APP_URL`** (server-only, optional, see `.env.example`): the student app's
  base URL. Each valid version links to `${STUDENT_APP_URL}/session/{courseSlug}/{chapterId}?version={versionId}` in a new
  tab (`previewUrl`; `&courseVersion=` is supported by the helper but not sent, so the Course's live version applies).
  Links are built on the server, at request time like `LANGFUSE_PROJECT_URL`; unset or not an http(s) URL
  (`parseStudentAppUrl`) means no link and the row says why. A valid, never-live version that no Admin Session has used
  shows "Not previewed yet" in amber and a notice, and its preview button is the primary one. Course versions show the
  same preview status but no link.
- **Chapter edit dialog.** Set live fills `lessonCount` from the version's `lessons_list.json`, so the field is disabled
  with a note while the Chapter has a live version (`liveContentVersionId`) and stays editable otherwise.
- **Audit log.** `content-version.upload|set-live|delete` have labels, the `content-version` target type is labelled and
  links to the owner's page (from `ownerKind` and `ownerId` in the entry), and the fields the backend records for these
  actions have labels.

## Cross-repo contract

`src/lib/auth/access-control.ts` is a **verbatim copy** of the backend's `src/lib/access-control.ts`
(`Becan-Learning/bcn-backend-main`, branch `dev`). Change both together or not at all. Do not reformat
or edit the copy; `tests/access-control-contract.test.ts` snapshots its statements and Role names and
fails when the two sides drift.

## Branches

- `dev` is the working branch and the source of truth. Run `git switch dev && git pull` before
  reading code. Work branches come from `dev`, and PRs target `dev`: `gh pr create --base dev`.
- `main` is production. Never commit, push or merge to `main` unless asked for a production release.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
