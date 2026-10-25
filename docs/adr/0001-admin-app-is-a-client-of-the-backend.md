# The admin app is a client of the backend, with no database or secrets

The admin dashboard is a Next.js app that works the way the student web app does. It proxies
`/api/auth/*` and `/api/v1/*` to the backend through its own origin, and its server code forwards the
`cookie` header. Admin authority lives only in the backend: Better Auth's admin plugin for Accounts,
and `/api/v1/admin/*` routes for Enrollments, Usage, Sessions and the Audit log. The admin
app has no database connection, no Drizzle schema and no Bunny or LiveKit credentials. Its role
checks only decide what to render; the backend re-checks every call.

Each app proxies auth through its own origin, so cookies stay first-party and host-only. Signing in to
the admin app does not sign you in to the student app. The backend accepts both origins through
Better Auth's dynamic `baseURL` (`allowedHosts`) and a CORS list.

## Considered Options

- **Server actions writing straight to Postgres with a shared schema.** Rejected: a second migration
  owner and a second place to enforce "Admins only".
- **Cross-subdomain cookies.** Rejected: one sign-in would cover both the student and the admin
  contexts.
