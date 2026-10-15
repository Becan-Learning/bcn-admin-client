import { describe, expect, it } from "vitest";
import { admin, roles, statements } from "@/lib/auth/access-control";

// src/lib/auth/access-control.ts is a verbatim copy of the backend's src/lib/access-control.ts.
// If this test fails after a change on either side, change both together (backend ADR 0002).
describe("access-control contract with the backend", () => {
  it("has the backend's statements", () => {
    expect(statements).toMatchInlineSnapshot(`
      {
        "course": [
          "create",
          "read",
          "update",
          "delete",
          "publish",
        ],
        "session": [
          "list",
          "revoke",
          "delete",
        ],
        "tutor": [
          "unlimited",
        ],
        "user": [
          "create",
          "list",
          "set-role",
          "ban",
          "impersonate",
          "impersonate-admins",
          "delete",
          "set-password",
          "set-email",
          "get",
          "update",
        ],
      }
    `);
  });

  it("has the backend's Role names", () => {
    expect(Object.keys(roles)).toMatchInlineSnapshot(`
      [
        "user",
        "admin",
      ]
    `);
  });

  it("gives the Admin Role the backend's permissions", () => {
    expect(admin.statements).toMatchInlineSnapshot(`
      {
        "course": [
          "create",
          "read",
          "update",
          "delete",
          "publish",
        ],
        "session": [
          "list",
          "revoke",
          "delete",
        ],
        "tutor": [
          "unlimited",
        ],
        "user": [
          "list",
          "set-role",
          "ban",
          "delete",
          "set-email",
          "get",
          "update",
        ],
      }
    `);
  });
});
