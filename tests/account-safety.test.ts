import { describe, expect, it } from "vitest";
import messages from "../messages/en.json";
import {
  accountActionErrorKey,
  banExpiresIn,
  banExpiryState,
  banReasonText,
  emailConfirmationMatches,
  needsFreshSession,
} from "@/lib/accounts/account-safety";
import { safeReturnPath, signInUrl } from "@/lib/auth/return-path";

const DAY = 24 * 60 * 60;

describe("banExpiresIn", () => {
  it("sends nothing for a ban that never expires", () => {
    expect(banExpiresIn("never", "")).toEqual({ ok: true, seconds: undefined });
    expect(banExpiresIn("never", "abc")).toEqual({ ok: true, seconds: undefined });
  });

  it("converts the day choices to seconds", () => {
    expect(banExpiresIn("1", "")).toEqual({ ok: true, seconds: DAY });
    expect(banExpiresIn("7", "")).toEqual({ ok: true, seconds: 7 * DAY });
    expect(banExpiresIn("30", "")).toEqual({ ok: true, seconds: 30 * DAY });
  });

  it("converts a custom number of days", () => {
    expect(banExpiresIn("custom", "14")).toEqual({ ok: true, seconds: 14 * DAY });
    expect(banExpiresIn("custom", " 3650 ")).toEqual({ ok: true, seconds: 3650 * DAY });
  });

  it("refuses a custom value that is not a whole number of days from 1 to 3650", () => {
    for (const bad of ["", "0", "-1", "1.5", "1e3", "abc", "3651", "+5"]) {
      expect(banExpiresIn("custom", bad)).toEqual({ ok: false });
    }
  });
});

describe("emailConfirmationMatches", () => {
  const email = "student@example.com";

  it("accepts the exact email, ignoring spaces around a paste", () => {
    expect(emailConfirmationMatches("student@example.com", email)).toBe(true);
    expect(emailConfirmationMatches("  student@example.com\n", email)).toBe(true);
  });

  it("refuses anything else", () => {
    expect(emailConfirmationMatches("", email)).toBe(false);
    expect(emailConfirmationMatches("student@example.co", email)).toBe(false);
    expect(emailConfirmationMatches("Student@example.com", email)).toBe(false);
    expect(emailConfirmationMatches("student@example.comm", email)).toBe(false);
  });

  it("never matches when the Account has no email", () => {
    expect(emailConfirmationMatches("", "")).toBe(false);
  });
});

describe("banReasonText", () => {
  it("hides the plugin's default reason and blanks", () => {
    expect(banReasonText("No reason")).toBeNull();
    expect(banReasonText("  ")).toBeNull();
    expect(banReasonText(null)).toBeNull();
    expect(banReasonText(undefined)).toBeNull();
  });

  it("returns a real reason trimmed", () => {
    expect(banReasonText(" spam ")).toBe("spam");
  });
});

describe("banExpiryState", () => {
  const now = new Date("2026-10-15T12:00:00Z");

  it("has no end without an expiry", () => {
    expect(banExpiryState(null, now)).toEqual({ kind: "never" });
    expect(banExpiryState(undefined, now)).toEqual({ kind: "never" });
    expect(banExpiryState("not a date", now)).toEqual({ kind: "never" });
  });

  it("tells an active ban from an expired one that is not yet lifted", () => {
    expect(banExpiryState("2026-10-16T12:00:00Z", now).kind).toBe("active");
    expect(banExpiryState("2026-10-14T12:00:00Z", now).kind).toBe("expired");
    expect(banExpiryState("2026-10-15T12:00:00Z", now).kind).toBe("expired");
  });
});

describe("accountActionErrorKey", () => {
  it("maps codes that already have a message", () => {
    expect(accountActionErrorKey({ code: "FRESH_SESSION_REQUIRED", status: 403 })).toBe("FRESH_SESSION_REQUIRED");
    expect(accountActionErrorKey({ code: "ADMIN_SELF_TARGET", status: 403 })).toBe("ADMIN_SELF_TARGET");
    expect(accountActionErrorKey({ code: "BANNED_USER", status: 403 })).toBe("BANNED_USER");
    expect(accountActionErrorKey({ code: "ADMIN_TWO_FACTOR_REQUIRED", status: 403 })).toBe("ADMIN_TWO_FACTOR_REQUIRED");
    expect(accountActionErrorKey({ code: "USER_NOT_FOUND", status: 404 })).toBe("USER_NOT_FOUND");
  });

  it("maps the admin plugin's own codes onto ours", () => {
    expect(accountActionErrorKey({ code: "YOU_CANNOT_BAN_YOURSELF", status: 400 })).toBe("ADMIN_SELF_TARGET");
    expect(accountActionErrorKey({ code: "YOU_CANNOT_REMOVE_YOURSELF", status: 400 })).toBe("ADMIN_SELF_TARGET");
    expect(accountActionErrorKey({ code: "SESSION_NOT_FRESH", status: 403 })).toBe("FRESH_SESSION_REQUIRED");
    expect(accountActionErrorKey({ code: "YOU_ARE_NOT_ALLOWED_TO_BAN_USERS", status: 403 })).toBe(
      "ADMIN_PERMISSION_REQUIRED",
    );
    expect(accountActionErrorKey({ code: "YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS", status: 403 })).toBe(
      "ADMIN_PERMISSION_REQUIRED",
    );
  });

  it("never shows backend text for an unknown code, and keeps the status fallbacks", () => {
    expect(accountActionErrorKey({ code: "SOMETHING_NEW", message: "raw text", status: 400 })).toBe("UNKNOWN");
    expect(accountActionErrorKey({ code: "toString" })).toBe("UNKNOWN");
    expect(accountActionErrorKey(null)).toBe("UNKNOWN");
    expect(accountActionErrorKey({ status: 429 })).toBe("RATE_LIMITED");
    expect(accountActionErrorKey({ status: 0 })).toBe("NETWORK");
  });

  it("only returns keys that have a message", () => {
    for (const code of ["ADMIN_SELF_TARGET", "FRESH_SESSION_REQUIRED", "BANNED_USER"]) {
      const key = accountActionErrorKey({ code });
      expect(messages.Errors[key]).toBeTruthy();
    }
  });
});

describe("needsFreshSession", () => {
  it("is true only for FRESH_SESSION_REQUIRED", () => {
    expect(needsFreshSession("FRESH_SESSION_REQUIRED")).toBe(true);
    expect(needsFreshSession("UNKNOWN")).toBe(false);
    expect(needsFreshSession(null)).toBe(false);
  });
});

describe("safeReturnPath", () => {
  it("accepts a path on this app", () => {
    expect(safeReturnPath("/accounts/abc123")).toBe("/accounts/abc123");
    expect(safeReturnPath("/accounts/abc?x=1#top")).toBe("/accounts/abc?x=1#top");
  });

  it("refuses anything that could leave the app", () => {
    for (const bad of ["", null, undefined, "accounts/1", "//evil.com", "/\\evil.com", "https://evil.com", "/a\nb", "javascript:alert(1)"]) {
      expect(safeReturnPath(bad)).toBeNull();
    }
  });
});

describe("signInUrl", () => {
  it("carries the page to return to", () => {
    expect(signInUrl("/accounts/abc")).toBe("/sign-in?next=%2Faccounts%2Fabc");
  });

  it("drops an unsafe page", () => {
    expect(signInUrl("//evil.com")).toBe("/sign-in");
  });
});
