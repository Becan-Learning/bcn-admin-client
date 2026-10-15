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
- **Arabic content** (names, titles) can appear anywhere. Put `dir="auto"` on every cell, field and
  preview that shows user content.
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
  component per section, all in `src/components/accounts/detail/`. The header shows the name (`dir="auto"`),
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
