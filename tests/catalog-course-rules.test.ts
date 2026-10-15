import { describe, expect, it } from "vitest";
import {
  chapterCountParts,
  courseStatusMoves,
  deleteBlockers,
  slugConfirmationMatches,
} from "@/lib/catalog/course-rules";
import type { AdminCourse } from "@/lib/catalog/types";

describe("courseStatusMoves", () => {
  it("offers every other status in Draft, Published, Archived order", () => {
    expect(courseStatusMoves("draft", { published: 0 }).map((move) => move.to)).toEqual([
      "published",
      "archived",
    ]);
    expect(courseStatusMoves("published", { published: 0 }).map((move) => move.to)).toEqual([
      "draft",
      "archived",
    ]);
    expect(courseStatusMoves("archived", { published: 0 }).map((move) => move.to)).toEqual([
      "draft",
      "published",
    ]);
  });

  it("blocks back to Draft while a Chapter is Published, and nothing else", () => {
    const moves = courseStatusMoves("published", { published: 2 });
    expect(moves.find((move) => move.to === "draft")?.blocked).toBe("publishedChapters");
    expect(moves.find((move) => move.to === "archived")?.blocked).toBeNull();
    expect(courseStatusMoves("published", { published: 0 })[0].blocked).toBeNull();
    // An Archived Course with a Published Chapter cannot go to Draft either, but can be published.
    const fromArchived = courseStatusMoves("archived", { published: 1 });
    expect(fromArchived.find((move) => move.to === "draft")?.blocked).toBe("publishedChapters");
    expect(fromArchived.find((move) => move.to === "published")?.blocked).toBeNull();
  });

  it("marks the moves that leave Archived, where the slug counts again", () => {
    expect(courseStatusMoves("archived", { published: 0 }).every((move) => move.leavesArchived)).toBe(true);
    expect(courseStatusMoves("draft", { published: 0 }).some((move) => move.leavesArchived)).toBe(false);
  });
});

describe("slugConfirmationMatches", () => {
  it("needs the exact slug, ignoring spaces around a paste", () => {
    expect(slugConfirmationMatches("calc-1", "calc-1")).toBe(true);
    expect(slugConfirmationMatches("  calc-1 ", "calc-1")).toBe(true);
    expect(slugConfirmationMatches("Calc-1", "calc-1")).toBe(false);
    expect(slugConfirmationMatches("calc", "calc-1")).toBe(false);
    expect(slugConfirmationMatches("", "calc-1")).toBe(false);
  });
});

const counts = (over: Partial<AdminCourse["counts"]> = {}): AdminCourse["counts"] => ({
  chapters: { draft: 0, comingSoon: 0, published: 0, archived: 0 },
  enrollments: 0,
  activeEnrollments: 0,
  sessions: 0,
  contentVersions: 0,
  ...over,
});

describe("deleteBlockers", () => {
  it("is empty for a deletable Course", () => {
    expect(deleteBlockers({ deletable: true, counts: counts() })).toEqual([]);
    // Never-live Content versions do not block, so their count alone says nothing.
    expect(deleteBlockers({ deletable: true, counts: counts({ contentVersions: 3 }) })).toEqual([]);
  });

  it("names Enrollments and Sessions from their counts", () => {
    expect(deleteBlockers({ deletable: false, counts: counts({ enrollments: 1 }) })).toEqual(["enrollments"]);
    expect(
      deleteBlockers({ deletable: false, counts: counts({ enrollments: 2, sessions: 5 }) }),
    ).toEqual(["enrollments", "sessions"]);
  });

  it("blames Content versions when neither count explains it", () => {
    expect(deleteBlockers({ deletable: false, counts: counts({ contentVersions: 1 }) })).toEqual([
      "contentVersions",
    ]);
  });
});

describe("chapterCountParts", () => {
  it("lists the non-zero counts, Published first", () => {
    expect(chapterCountParts({ draft: 2, comingSoon: 3, published: 1, archived: 0 })).toEqual([
      { state: "published", count: 1 },
      { state: "comingSoon", count: 3 },
      { state: "draft", count: 2 },
    ]);
  });

  it("is empty for a Course with no Chapters", () => {
    expect(chapterCountParts({ draft: 0, comingSoon: 0, published: 0, archived: 0 })).toEqual([]);
  });
});
