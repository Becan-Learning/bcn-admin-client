import { describe, expect, it } from "vitest";
import {
  diffInstitution,
  diffMajor,
  hasChanges,
  hasIssues,
  institutionCreateBody,
  majorCreateBody,
  parseSortOrder,
  validateForm,
  type MajorValues,
} from "@/lib/catalog/form";

const initial: MajorValues = {
  institutionId: "ksu",
  nameEn: "Computer Science",
  nameAr: "علوم الحاسب",
  sortOrder: "2",
};

describe("parseSortOrder", () => {
  it("reads whole numbers from 0 to 1,000,000", () => {
    expect(parseSortOrder("0")).toBe(0);
    expect(parseSortOrder(" 12 ")).toBe(12);
    expect(parseSortOrder("1000000")).toBe(1_000_000);
  });

  it("refuses anything else", () => {
    for (const input of ["", "  ", "-1", "1.5", "1e3", "+2", "1000001", "abc", "1,000", "12345678"]) {
      expect(parseSortOrder(input), input).toBeNull();
    }
  });
});

describe("validateForm", () => {
  const good = { nameEn: "Law", nameAr: "الحقوق", sortOrder: "0" };

  it("passes a good create", () => {
    expect(validateForm(good, "ksu-law")).toEqual({});
    expect(hasIssues(validateForm(good, "ksu-law"))).toBe(false);
  });

  it("does not check the id on an edit", () => {
    expect(validateForm(good, null)).toEqual({});
  });

  it("flags an empty or malformed id", () => {
    expect(validateForm(good, "")).toEqual({ id: "required" });
    expect(validateForm(good, "KSU Law")).toEqual({ id: "invalidId" });
  });

  it("flags blank and over-long names, and a bad sort order", () => {
    expect(validateForm({ ...good, nameEn: "  ", nameAr: "" }, null)).toEqual({
      nameEn: "required",
      nameAr: "required",
    });
    expect(validateForm({ ...good, nameEn: "x".repeat(201) }, null)).toEqual({ nameEn: "tooLong" });
    expect(validateForm({ ...good, nameEn: "x".repeat(200) }, null)).toEqual({});
    expect(validateForm({ ...good, sortOrder: "1.5" }, null)).toEqual({ sortOrder: "invalidSortOrder" });
  });

  it("needs an Institution for a Major", () => {
    expect(validateForm({ ...good, institutionId: "" }, "x", { needsInstitution: true })).toEqual({
      institutionId: "required",
    });
    expect(validateForm({ ...good, institutionId: "ksu" }, "x", { needsInstitution: true })).toEqual({});
  });
});

describe("create bodies", () => {
  it("trim the names and turn the sort order into a number", () => {
    expect(
      institutionCreateBody("ksu", { nameEn: " KSU ", nameAr: " جامعة ", sortOrder: "3" }),
    ).toEqual({ id: "ksu", nameEn: "KSU", nameAr: "جامعة", sortOrder: 3 });
  });

  it("carry the Institution for a Major", () => {
    expect(majorCreateBody("ksu-cs", initial)).toEqual({
      id: "ksu-cs",
      institutionId: "ksu",
      nameEn: "Computer Science",
      nameAr: "علوم الحاسب",
      sortOrder: 2,
    });
  });
});

describe("diffInstitution and diffMajor", () => {
  it("send nothing when nothing changed", () => {
    expect(diffInstitution(initial, { ...initial })).toEqual({});
    expect(diffMajor(initial, { ...initial })).toEqual({});
    expect(hasChanges(diffMajor(initial, { ...initial }))).toBe(false);
  });

  it("send only the fields that changed", () => {
    expect(diffMajor(initial, { ...initial, nameEn: "CS" })).toEqual({ nameEn: "CS" });
    expect(diffMajor(initial, { ...initial, nameAr: "حاسب" })).toEqual({ nameAr: "حاسب" });
    expect(diffMajor(initial, { ...initial, sortOrder: "5" })).toEqual({ sortOrder: 5 });
    expect(diffMajor(initial, { ...initial, institutionId: "kfupm" })).toEqual({
      institutionId: "kfupm",
    });
  });

  it("compare names trimmed, and a sort order by value", () => {
    expect(diffMajor(initial, { ...initial, nameEn: "  Computer Science " })).toEqual({});
    expect(diffMajor(initial, { ...initial, sortOrder: "02" })).toEqual({});
  });

  it("never send an unparsable sort order", () => {
    expect(diffMajor(initial, { ...initial, sortOrder: "x" })).toEqual({});
  });

  it("never put the Institution or the id in an Institution edit", () => {
    // A Major's values carry an Institution; the Institution diff must ignore it.
    const changes = diffInstitution(initial, { ...initial, institutionId: "other", nameEn: "A" } as MajorValues);
    expect(Object.keys(changes)).toEqual(["nameEn"]);
  });
});
