# Release runbook: Milestones 1 and 2

How to ship the admin dashboard (Milestone 1) and Catalog and content (Milestone 2) together, in one
maintenance window. First on staging, then on production. Tracking: Becan-Learning/bcn-admin-client#26 (R1), which
also covers the Milestone 1 deploy (#8). Status of the code: `docs/STATE.md`.

**Why one window.** The backend migration `identity_and_versions` rewrites Course and Chapter keys in place and
changes the token request, the participant attributes and the Catalog shape. The backend, agent, web and admin apps
deployed before it can't talk to the backend after it, or the other way round. It can't be rolled back either:
Drizzle migrations only go forward. So all four deploy together, and the database is backed up first.

**What ships.** Backend `stage` is 43 commits behind `dev` and `main` is 72 behind, so the backend release carries
all of Milestone 1 (admin plugin, two-factor, Audit log, Admin Sessions) and all of Milestone 2. The web and agent
`main` branches are behind `dev` the same way. The admin app has never been deployed.

Lines marked **Confirm** are facts this runbook could not check from the repos. Settle each before the window.

## 1. Before the window (no downtime)

### Bunny Storage

- One storage zone holds all content. The backend now **writes** to it, under `courses/{courseId}/chapters/{chapterId}/v{n}/`
  and `courses/{courseId}/course/v{n}/`. The web and agent keep reading from it.
- The backend needs the zone's **read-write** password. The web and agent can keep a read-only one.
- The existing content (`courses/becan-test/ch_1/`, `courses/becan-test/01_Course_Knowledge_Schema.md`,
  `courses/becan-test/cast.json`) stays where it is. The migration registers it as version 1 in place.

### Environment variables

Set these on each service **before** deploying the new code. The old code ignores them, so setting them early is
safe. Do it for staging now, and for production before its window.

| Service | Variable | Value | Notes |
|---|---|---|---|
| Backend (Railway) | `ADMIN_ORIGIN` | the admin app origin, e.g. `https://admin.<domain>` | Milestone 1. Scheme, host and port only, no trailing slash, same scheme as `CORS_ORIGIN`. Also the only origin the upload route's CORS allows. |
| Backend | `BUNNY_STORAGE_ZONE` | the storage zone name | All three Bunny variables are required in production, or the server refuses to start. |
| Backend | `BUNNY_STORAGE_HOST` | the zone's storage host, e.g. `storage.bunnycdn.com` or a regional one | The same host the agent uses as `BUNNY_STORAGE_REGION`. |
| Backend | `BUNNY_STORAGE_KEY` | the zone's **read-write** password | Never exposed to a browser. |
| Backend | `PUBLIC_API_ORIGIN` | the backend's public origin, e.g. `https://api.<domain>` | Required in production. The admin app's browser posts uploads straight to `{PUBLIC_API_ORIGIN}/api/v1/uploads/content`. |
| Backend | `CONTENT_UPLOAD_MAX_BYTES` | optional, default 209715200 (200 MB) | Largest zip, and the largest it may unpack to. |
| Admin (Vercel) | `BACKEND_URL` | the backend origin the rewrites proxy to | Required in production. |
| Admin | `STUDENT_APP_URL` | the web app origin | Optional. Without it there is no "Preview in student app" link. |
| Admin | `LANGFUSE_PROJECT_URL` | e.g. `https://cloud.langfuse.com/project/<id>` | Optional. Without it there are no Session trace links. |
| Web | unchanged | `BACKEND_URL`, `BUNNY_STORAGE_PULL_ZONE_URL`, `BUNNY_STORAGE_API_KEY` | `BUNNY_STORAGE_PULL_ZONE_URL` must reach the same zone the backend writes to. |
| Agent (LiveKit Cloud) | unchanged | `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_API_KEY`, `BUNNY_STORAGE_REGION` | **`ENVIRONMENT` must not be `development`.** In development mode the agent reads lesson files from a local folder by file name and ignores the content paths, so versions would not work. |

### Admin app (Milestone 1, #8)

- Create the Vercel project for `Becan-Learning/bcn-admin-client` on the `admin.` domain, with deployment
  protection on previews. **Confirm** which branch each Vercel environment builds (the admin repo has only `dev`;
  a `main` branch is created at the production release).
- Set the variables above.

### Decide and announce

- **Confirm** how staging is set up for the web (which Vercel environment and branch) and for the agent (which
  LiveKit Cloud project; `livekit.toml` names `becan-test`). The order below assumes each has a staging target.
- Pick a window and tell anyone testing staging. Sessions that are running when the window starts will break.

## 2. Staging window

Run every step in order. Note the time of each one.

1. **Back up the database.** Create a Neon branch (or a point-in-time restore point) of the staging database
   **just before** the backend deploys. That backup is the only way back.
2. **Backend.** Open a PR from `dev` to `stage` in `bcn-backend-main` and merge it. `deploy-staging.yml` runs the
   tests, then `pnpm db:migrate`, then `pnpm db:seed`, then the Railway deploy.
   - Watch the migrate step. If it fails, it rolls back its own transaction. The likely cause is a Study Session row
     that names a Chapter that doesn't exist; the error says how many rows. Fix the data, then re-run the workflow.
   - The seed now only inserts missing rows. It never reverts an edit.
3. **Agent.** Deploy `dev` of `bcn-lk-agent-main` to the staging agent. **Confirm** the mechanism beforehand: the
   agent README describes LiveKit Cloud (`lk agent create` for the first deploy, `lk agent deploy` for updates), but
   it also names a `Dockerfile` that isn't in the repo.
4. **Web.** Deploy `dev` of `bcn-web-client` to staging.
5. **Admin.** Deploy `dev` of `bcn-admin-client` to staging.
6. **First Admin.** The Account must already exist (sign up in the web app; phone, Institution and Major are
   required). Then, with `DATABASE_URL` pointing at **staging**, run `pnpm admin:promote <email>` in the backend
   repo. Sign in to the admin app, set up two-factor when asked, and save the backup codes.

## 3. Staging checks

Work through these as the Admin from step 6 and a separate Student Account. Record each result in #26.

**Students, existing content**
- [ ] The Catalog shows `becan-test` and the nine display Courses. Their Chapters show as coming soon.
- [ ] Enroll in `becan-test` and start Chapter 1. The URL is `/session/becan-test/<uuid>`. Lessons and slides load.
- [ ] The tutor says the Chapter number and title. The Langfuse trace metadata has `course_id`, `chapter_id`,
      `content_path` (`courses/becan-test/ch_1/`) and `course_content_path` (`courses/becan-test/`).
- [ ] Usage counts the Session, and an old-style URL (`/session/becan-test/1`) gives not-found.

**Admin, Milestone 1** (it was checked end to end locally; spot-check it here)
- [ ] The Accounts list and the Account detail page load. The Audit log records the actions you take.
- [ ] A password-reset email sent from the admin app links to the **web** origin.

**Catalog**
- [ ] Create an Institution and a Major, then a Course (it is a Draft) and two Chapters (Drafts).
- [ ] Upload the Course content version: a zip with `01_Course_Knowledge_Schema.md` and `cast.json`. Set it live.
- [ ] Upload a real Chapter zip **larger than 5 MB**, then a zip made in macOS Finder. Both are valid, and the file
      list shows only the real files. The files are in Bunny under `courses/<courseId>/chapters/<chapterId>/v1/`.
- [ ] Upload a broken zip (no `slides.pdf`). It is stored as invalid with a report, and it can't go live.
- [ ] **Confirm** that Railway accepts an upload close to the size limit (try about 50 MB).

**Preview**
- [ ] "Preview in student app" opens the web app on the Draft Chapter, marked «مسوّدة» and "Preview: version 1".
- [ ] Start it. The Session teaches the uploaded content (check `content_path` in Langfuse), and the version
      becomes "Previewed" in the admin app.
- [ ] The Student Account doesn't see the Draft Course, and opening the preview link shows nothing extra.

**Going live**
- [ ] Set the Chapter version live (the lesson count updates). Publish the Chapter, then the Course.
- [ ] The Student enrolls and starts a Session on it.
- [ ] Upload version 2 and set it live while the Student's Session from the previous step is still open. That
      Session keeps teaching version 1; a new Session after it uses version 2.
- [ ] Roll back to version 1. New Sessions use version 1 again.
- [ ] Delete a never-live version. Its files are gone from Bunny.

**Structure**
- [ ] Reorder Chapters, then replace a Published Chapter with a Draft. Student pages show the new order and Chapter.
- [ ] Change a Course's slug. An old session link redirects; the old Course page gives not-found.
- [ ] Archive the Course. It leaves the Catalog. The enrolled Student still opens it (marked «مؤرشف») and starts a
      Session. Another Student can't enroll.
- [ ] Every action above appears in the Audit log.

If any check fails, fix it on `dev` and redeploy the affected service. The migration doesn't run twice.

## 4. Production window

Only after every staging check passes, and only on an explicit go-ahead: merging into `main` is a production release.

1. **Back up** the production database (Neon branch or restore point), just before the backend deploys.
2. **Backend.** Open a PR from `stage` to `main` and merge it. `deploy-production.yml` runs the tests, then the
   migration, then the deploy. **Do not tick `seed`** on a manual run: production's Catalog is owned by the dashboard.
3. **Agent, web, admin.** Merge `dev` into `main` in each repo (the admin repo creates `main`), then deploy each
   to production.
4. **First Admin** on production, as in staging step 6, with `DATABASE_URL` pointing at production.
5. **Smoke checks:** the Student checks under "Students, existing content", one upload and preview on a Draft
   Course, and the Audit log.
6. Update `docs/STATE.md` (Milestones 1 and 2 deployed), then close #8, #26 and the tracking issues #1 and #21.

## 5. Rolling back

The migration can't be undone in place. To go back:

1. Stop traffic (maintenance page, or scale the backend to zero).
2. Restore the database from the backup taken in step 1 of that window.
3. Redeploy the previous commit of each of the four services, the ones that ran before the window.
4. Remove nothing from Bunny: version folders written during the window do no harm. The old code reads only the old
   paths.

Anything written during the window (Enrollments, Sessions, Catalog edits, Audit log entries) is lost with the
restore. Note what changed before deciding to roll back.
