import { describe, expect, it } from "vitest";
import { adminGate, roleHasPermission } from "@/lib/auth/gate";

const admin = (overrides: { twoFactorEnabled?: boolean | null } = {}) => ({
  user: { role: "admin", twoFactorEnabled: true, ...overrides },
});

describe("adminGate", () => {
  it("sends a visitor without a session to sign-in", () => {
    expect(adminGate(null)).toBe("sign-in");
  });

  it("refuses a Student", () => {
    expect(adminGate({ user: { role: "user", twoFactorEnabled: true } })).toBe("no-access");
  });

  it("refuses a Student before it asks about two-factor", () => {
    expect(adminGate({ user: { role: "user", twoFactorEnabled: false } })).toBe("no-access");
  });

  it("treats a missing or unknown Role as no access", () => {
    expect(adminGate({ user: { role: null, twoFactorEnabled: true } })).toBe("no-access");
    expect(adminGate({ user: { twoFactorEnabled: true } })).toBe("no-access");
    expect(adminGate({ user: { role: "superuser", twoFactorEnabled: true } })).toBe("no-access");
    expect(adminGate({ user: { role: "toString", twoFactorEnabled: true } })).toBe("no-access");
  });

  it("sends an Admin without two-factor to setup", () => {
    expect(adminGate(admin({ twoFactorEnabled: false }))).toBe("setup-two-factor");
    expect(adminGate(admin({ twoFactorEnabled: null }))).toBe("setup-two-factor");
    expect(adminGate({ user: { role: "admin" } })).toBe("setup-two-factor");
  });

  it("lets an Admin with two-factor in", () => {
    expect(adminGate(admin())).toBe("ok");
  });

  it("accepts a comma-separated Role list that includes the Admin Role", () => {
    expect(adminGate({ user: { role: "user,admin", twoFactorEnabled: true } })).toBe("ok");
  });
});

describe("roleHasPermission", () => {
  it("reads permissions from the copied roles, not from role names", () => {
    expect(roleHasPermission("admin", { user: ["list"] })).toBe(true);
    expect(roleHasPermission("admin", { tutor: ["unlimited"] })).toBe(true);
    expect(roleHasPermission("user", { user: ["list"] })).toBe(false);
  });

  it("denies the actions the Admin Role leaves out", () => {
    expect(roleHasPermission("admin", { user: ["impersonate"] })).toBe(false);
    expect(roleHasPermission("admin", { user: ["set-password"] })).toBe(false);
    expect(roleHasPermission("admin", { user: ["create"] })).toBe(false);
  });
});
