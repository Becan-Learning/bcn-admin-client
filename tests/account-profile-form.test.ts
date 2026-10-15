import { describe, expect, it } from "vitest";
import messages from "../messages/en.json";
import {
  diffProfile,
  hasChanges,
  isEmailFieldError,
  isSameEmail,
  missingFields,
  normalizePhoneNumber,
  normalizeProfile,
  placeProfileError,
  profileFieldForError,
  type ProfileValues,
} from "@/lib/accounts/profile-form";
import { authErrorKey } from "@/lib/auth/errors";
import { backendErrorKey } from "@/lib/accounts/errors";

const initial: ProfileValues = {
  name: "Sara",
  phoneNumber: "+966501234567",
  institutionId: "ksu",
  majorId: "ksu-cs",
};

describe("diffProfile", () => {
  it("sends nothing when nothing changed", () => {
    expect(diffProfile(initial, { ...initial })).toEqual({});
    expect(hasChanges(diffProfile(initial, { ...initial }))).toBe(false);
  });

  it("sends only the fields that changed", () => {
    expect(diffProfile(initial, { ...initial, name: "Sara Ali" })).toEqual({ name: "Sara Ali" });
    expect(diffProfile(initial, { ...initial, phoneNumber: "+966509999999" })).toEqual({
      phoneNumber: "+966509999999",
    });
    expect(diffProfile(initial, { ...initial, majorId: "ksu-ee" })).toEqual({ majorId: "ksu-ee" });
  });

  it("trims the name, and a name that only differs in spaces is no change", () => {
    expect(diffProfile(initial, { ...initial, name: "  Sara  " })).toEqual({});
    expect(diffProfile(initial, { ...initial, name: "  Layla " })).toEqual({ name: "Layla" });
  });

  it("repairs a local phone spelling before comparing", () => {
    expect(diffProfile(initial, { ...initial, phoneNumber: "050 123 4567" })).toEqual({});
    expect(diffProfile(initial, { ...initial, phoneNumber: "0509999999" })).toEqual({
      phoneNumber: "+966509999999",
    });
  });

  it("sends the Major with a new Institution, even if the Major value is unchanged", () => {
    expect(
      diffProfile(initial, { ...initial, institutionId: "kfupm", majorId: "kfupm-cs" }),
    ).toEqual({ institutionId: "kfupm", majorId: "kfupm-cs" });
    expect(diffProfile(initial, { ...initial, institutionId: "kfupm" })).toEqual({
      institutionId: "kfupm",
      majorId: "ksu-cs",
    });
  });

  it("never includes fields outside the Profile", () => {
    const keys = Object.keys(
      diffProfile(initial, { name: "A", phoneNumber: "+966500000000", institutionId: "x", majorId: "y" }),
    );
    expect(keys.sort()).toEqual(["institutionId", "majorId", "name", "phoneNumber"]);
  });
});

describe("normalizePhoneNumber", () => {
  it("turns the usual Saudi spellings into E.164", () => {
    expect(normalizePhoneNumber("0501234567")).toBe("+966501234567");
    expect(normalizePhoneNumber("501234567")).toBe("+966501234567");
    expect(normalizePhoneNumber("966501234567")).toBe("+966501234567");
    expect(normalizePhoneNumber("00966501234567")).toBe("+966501234567");
    expect(normalizePhoneNumber("+966 50-123 4567")).toBe("+966501234567");
  });

  it("leaves anything else for the backend to reject", () => {
    expect(normalizePhoneNumber("12345")).toBe("12345");
    expect(normalizePhoneNumber("+441234567890")).toBe("+441234567890");
  });
});

describe("missingFields", () => {
  it("lists empty fields, counting blanks as empty", () => {
    expect(missingFields(initial)).toEqual([]);
    expect(missingFields({ ...initial, name: "   ", majorId: "" })).toEqual(["name", "majorId"]);
  });

  it("normalizes before judging", () => {
    expect(normalizeProfile({ ...initial, name: " X " }).name).toBe("X");
  });
});

describe("error code to field", () => {
  it("places phone errors on the phone field", () => {
    expect(profileFieldForError("INVALID_PHONE_NUMBER")).toBe("phoneNumber");
    expect(profileFieldForError("PHONE_NUMBER_TAKEN")).toBe("phoneNumber");
  });

  it("places placement errors on their fields", () => {
    expect(profileFieldForError("INVALID_INSTITUTION")).toBe("institutionId");
    expect(profileFieldForError("INVALID_MAJOR")).toBe("majorId");
  });

  it("leaves other codes for the form as a whole", () => {
    expect(profileFieldForError("RATE_LIMITED")).toBeNull();
    expect(profileFieldForError("constructor")).toBeNull();
    expect(profileFieldForError(undefined)).toBeNull();
  });

  it("recognises the email field errors", () => {
    expect(isEmailFieldError("INVALID_EMAIL")).toBe(true);
    expect(isEmailFieldError("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")).toBe(true);
    expect(isEmailFieldError("PHONE_NUMBER_TAKEN")).toBe(false);
    expect(isEmailFieldError(undefined)).toBe(false);
  });

  it("combines the field with the message key", () => {
    const error = { code: "INVALID_MAJOR", status: 400 };
    expect(placeProfileError(error.code, authErrorKey(error))).toEqual({
      field: "majorId",
      errorKey: "INVALID_MAJOR",
    });
    expect(placeProfileError("RATE_LIMITED", "RATE_LIMITED").field).toBeNull();
  });

  it("has an English message for every code the backend can answer here", () => {
    for (const code of [
      "INVALID_PHONE_NUMBER",
      "PHONE_NUMBER_TAKEN",
      "INVALID_INSTITUTION",
      "INVALID_MAJOR",
      "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
      "ADMIN_UPDATE_FIELD_NOT_ALLOWED",
      "ACCOUNT_NOT_FOUND",
      "EMAIL_ALREADY_VERIFIED",
      "INVALID_EMAIL",
    ]) {
      expect(authErrorKey({ code, status: 400 }), code).toBe(code);
      expect(messages.Errors[code as keyof typeof messages.Errors]).toBeTruthy();
    }
    expect(backendErrorKey({ status: 409, code: "EMAIL_ALREADY_VERIFIED" })).toBe(
      "EMAIL_ALREADY_VERIFIED",
    );
  });
});

describe("isSameEmail", () => {
  it("ignores case and surrounding spaces", () => {
    expect(isSameEmail("sara@example.com", " Sara@Example.com ")).toBe(true);
    expect(isSameEmail("sara@example.com", "sara2@example.com")).toBe(false);
  });
});
