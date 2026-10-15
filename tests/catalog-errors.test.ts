import { describe, expect, it } from "vitest";
import messages from "../messages/en.json";
import {
  catalogErrorKey,
  catalogFieldForError,
  placeCatalogError,
} from "@/lib/catalog/errors";

// Every code B2 answers on the Institution, Major, Course and Chapter routes (backend PR 43).
const CODES = [
  "INSTITUTION_ID_TAKEN",
  "MAJOR_ID_TAKEN",
  "INVALID_INSTITUTION",
  "MAJOR_IN_USE",
  "INSTITUTION_NOT_FOUND",
  "MAJOR_NOT_FOUND",
  "SLUG_TAKEN",
  "PUBLISH_PRECONDITION",
  "COURSE_IN_USE",
  "COURSE_NOT_FOUND",
  "CHAPTER_NUMBER_TAKEN",
  "CHAPTER_ORDER_MISMATCH",
  "REPLACEMENT_INVALID",
  "CHAPTER_IN_USE",
  "CHAPTER_NOT_FOUND",
  "UNAUTHENTICATED",
  "ADMIN_PERMISSION_REQUIRED",
  "ADMIN_TWO_FACTOR_REQUIRED",
  "RATE_LIMITED",
] as const;

describe("catalogErrorKey", () => {
  it("has an English message for every code the Catalog routes answer", () => {
    for (const code of CODES) {
      expect(messages.Errors[code], code).toBeTruthy();
      expect(catalogErrorKey({ status: 400, code }), code).toBe(code);
    }
  });

  it("maps a 400 without a code (the body check) to INVALID_REQUEST", () => {
    expect(catalogErrorKey({ status: 400 })).toBe("INVALID_REQUEST");
    expect(catalogErrorKey({ status: 400, code: "SOMETHING_NEW" })).toBe("INVALID_REQUEST");
    expect(messages.Errors.INVALID_REQUEST).toBeTruthy();
  });

  it("treats 401 as an ended session and 429 as rate limiting", () => {
    expect(catalogErrorKey({ status: 401 })).toBe("UNAUTHENTICATED");
    expect(catalogErrorKey({ status: 429 })).toBe("RATE_LIMITED");
  });

  it("falls back to UNKNOWN for a server error", () => {
    expect(catalogErrorKey({ status: 500 })).toBe("UNKNOWN");
  });
});

describe("catalogFieldForError", () => {
  it("places the id and Institution refusals on their fields", () => {
    expect(catalogFieldForError("INSTITUTION_ID_TAKEN")).toBe("id");
    expect(catalogFieldForError("MAJOR_ID_TAKEN")).toBe("id");
    expect(catalogFieldForError("INVALID_INSTITUTION")).toBe("institutionId");
    expect(catalogFieldForError("MAJOR_IN_USE")).toBe("institutionId");
  });

  it("places a taken slug on the slug field", () => {
    expect(catalogFieldForError("SLUG_TAKEN")).toBe("slug");
  });

  it("places a taken Chapter number on the number field", () => {
    expect(catalogFieldForError("CHAPTER_NUMBER_TAKEN")).toBe("number");
  });

  it("leaves other codes for the form as a whole", () => {
    expect(catalogFieldForError("CHAPTER_ORDER_MISMATCH")).toBeNull();
    expect(catalogFieldForError("REPLACEMENT_INVALID")).toBeNull();
    expect(catalogFieldForError("CHAPTER_IN_USE")).toBeNull();
    expect(catalogFieldForError("RATE_LIMITED")).toBeNull();
    expect(catalogFieldForError("PUBLISH_PRECONDITION")).toBeNull();
    expect(catalogFieldForError("COURSE_IN_USE")).toBeNull();
    expect(catalogFieldForError("constructor")).toBeNull();
    expect(catalogFieldForError(undefined)).toBeNull();
  });

  it("combines the field with the message key", () => {
    expect(placeCatalogError({ status: 409, code: "MAJOR_ID_TAKEN" })).toEqual({
      field: "id",
      errorKey: "MAJOR_ID_TAKEN",
    });
    expect(placeCatalogError({ status: 429 })).toEqual({ field: null, errorKey: "RATE_LIMITED" });
  });
});
