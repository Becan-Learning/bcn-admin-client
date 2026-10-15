import { describe, expect, it } from "vitest";
import {
  chapterCreateBody,
  chapterValues,
  diffChapter,
  EMPTY_CHAPTER_VALUES,
  parseChapterNumber,
  parseLessonCount,
  parseMinutes,
  validateChapterForm,
  type ChapterValues,
} from "@/lib/catalog/chapter-form";
import type { AdminChapter } from "@/lib/catalog/types";

const chapter: AdminChapter = {
  id: "ch-1",
  courseId: "c-1",
  number: 3,
  title: { ar: "الفصل", en: "Limits" },
  minutes: 25,
  lessonCount: 4,
  state: "published",
  liveContentVersionId: "v1",
  counts: { sessions: 0, contentVersions: 1 },
  deletable: false,
  createdAt: "2026-10-15T00:00:00.000Z",
};
const filled: ChapterValues = {
  titleEn: "Limits",
  titleAr: "الفصل",
  minutes: "25",
  lessonCount: "4",
  number: "",
};

describe("number parsing", () => {
  it("accepts whole numbers in range and nothing else", () => {
    expect(parseChapterNumber("1")).toBe(1);
    expect(parseChapterNumber(" 10000 ")).toBe(10_000);
    expect(parseChapterNumber("0")).toBeNull();
    expect(parseChapterNumber("10001")).toBeNull();
    expect(parseChapterNumber("1.5")).toBeNull();
    expect(parseChapterNumber("-2")).toBeNull();
    expect(parseChapterNumber("1e3")).toBeNull();
    expect(parseChapterNumber("")).toBeNull();
    expect(parseMinutes("1000")).toBe(1000);
    expect(parseMinutes("0")).toBeNull();
    expect(parseMinutes("1001")).toBeNull();
    expect(parseLessonCount("0")).toBe(0);
    expect(parseLessonCount("1000")).toBe(1000);
    expect(parseLessonCount("1001")).toBeNull();
    expect(parseLessonCount("")).toBeNull();
  });
});

describe("validateChapterForm", () => {
  it("passes a filled form, with a blank number on create only", () => {
    expect(validateChapterForm(filled, "create")).toEqual({});
    expect(validateChapterForm({ ...filled, number: "5" }, "create")).toEqual({});
    expect(validateChapterForm({ ...filled, number: "5" }, "edit")).toEqual({});
    expect(validateChapterForm(filled, "edit")).toEqual({ number: "invalidNumber" });
  });

  it("reports each bad field", () => {
    expect(validateChapterForm(EMPTY_CHAPTER_VALUES, "create")).toEqual({
      titleEn: "required",
      titleAr: "required",
      minutes: "invalidMinutes",
    });
    expect(
      validateChapterForm(
        { titleEn: "x".repeat(201), titleAr: "  ", minutes: "0", lessonCount: "-1", number: "0" },
        "create",
      ),
    ).toEqual({
      titleEn: "tooLong",
      titleAr: "required",
      minutes: "invalidMinutes",
      lessonCount: "invalidLessonCount",
      number: "invalidNumber",
    });
  });
});

describe("chapterCreateBody", () => {
  it("leaves the number out when blank, so the backend picks the next one", () => {
    expect(chapterCreateBody({ ...filled, titleEn: " Limits ", titleAr: " الفصل " })).toEqual({
      titleEn: "Limits",
      titleAr: "الفصل",
      minutes: 25,
      lessonCount: 4,
    });
  });
  it("sends a number the Admin typed", () => {
    expect(chapterCreateBody({ ...filled, number: "7" })?.number).toBe(7);
  });
  it("is null for an invalid form", () => {
    expect(chapterCreateBody({ ...filled, minutes: "" })).toBeNull();
    expect(chapterCreateBody({ ...filled, number: "abc" })).toBeNull();
  });
});

describe("diffChapter", () => {
  const initial = chapterValues(chapter);

  it("starts from the stored values", () => {
    expect(initial).toEqual({ titleEn: "Limits", titleAr: "الفصل", minutes: "25", lessonCount: "4", number: "3" });
    expect(diffChapter(initial, { ...initial })).toEqual({});
  });
  it("sends only what changed", () => {
    expect(diffChapter(initial, { ...initial, titleEn: " Limits and continuity " })).toEqual({
      titleEn: "Limits and continuity",
    });
    expect(diffChapter(initial, { ...initial, minutes: "30", number: "5" })).toEqual({ minutes: 30, number: 5 });
    expect(diffChapter(initial, { ...initial, lessonCount: "0" })).toEqual({ lessonCount: 0 });
  });
  it("ignores spaces around unchanged text and fields that do not parse", () => {
    expect(diffChapter(initial, { ...initial, titleAr: " الفصل " })).toEqual({});
    expect(diffChapter(initial, { ...initial, minutes: "abc", number: "" })).toEqual({});
  });
});
