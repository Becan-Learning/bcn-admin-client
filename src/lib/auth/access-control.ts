// CROSS-REPO CONTRACT with bcn-admin-client. This file imports only from Better Auth so the admin
// app can copy it verbatim for `adminClient({ ac, roles })`. Both copies must change together: a
// statement or role that exists on one side only makes the admin UI and the backend disagree.
// Backend ADR 0002. Code checks permissions (`user:ban`, `tutor:unlimited`), never role names.
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// The plugin's `user` and `session` statements, plus ours.
export const statements = {
  ...defaultStatements,
  course: ["create", "read", "update", "delete", "publish"],
  tutor: ["unlimited"],
  audit: ["read"]
} as const;

export const ac = createAccessControl(statements);

// A Student: the default Role. Holds no admin permission.
export const student = ac.newRole({});

// An Admin holds every permission except these `user` actions: impersonation is deferred, Admins
// never set passwords (they send a reset email instead), and Admins don't create Accounts in v1
// (Students sign up themselves).
export const admin = ac.newRole({
  user: ["list", "set-role", "ban", "delete", "set-email", "get", "update"],
  session: ["list", "revoke", "delete"],
  course: ["create", "read", "update", "delete", "publish"],
  tutor: ["unlimited"],
  audit: ["read"]
});

// Keyed by the Role names stored on the user row. `user` is the Student Role's stored name.
export const roles = { user: student, admin };
