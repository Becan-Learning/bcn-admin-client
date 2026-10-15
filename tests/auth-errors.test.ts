import { describe, expect, it } from "vitest";
import messages from "../messages/en.json";
import { authErrorKey } from "@/lib/auth/errors";

describe("authErrorKey", () => {
  it("maps known Better Auth codes to their own message", () => {
    expect(authErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(authErrorKey({ code: "INVALID_CODE", status: 401 })).toBe("INVALID_CODE");
    expect(authErrorKey({ code: "ADMIN_TWO_FACTOR_REQUIRED", status: 403 })).toBe("ADMIN_TWO_FACTOR_REQUIRED");
  });

  it("never shows backend text for an unknown code", () => {
    expect(authErrorKey({ code: "SOMETHING_NEW", message: "raw backend text", status: 400 })).toBe("UNKNOWN");
    expect(authErrorKey({ code: "constructor" })).toBe("UNKNOWN");
    expect(authErrorKey(null)).toBe("UNKNOWN");
  });

  it("maps rate limits and network failures by status", () => {
    expect(authErrorKey({ status: 429 })).toBe("RATE_LIMITED");
    expect(authErrorKey({ status: 0 })).toBe("NETWORK");
  });

  it("only returns keys that have an English message", () => {
    for (const key of Object.keys(messages.Errors)) {
      expect(messages.Errors[key as keyof typeof messages.Errors]).toBeTruthy();
    }
  });
});
