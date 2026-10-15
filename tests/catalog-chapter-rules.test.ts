import { describe, expect, it } from "vitest";
import {
  canReplace,
  chapterDeleteBlockers,
  chapterStateMoves,
  effectiveOrder,
  groupChapters,
  moveBy,
  moveToId,
  nextChapterNumber,
  orderChanged,
  orderToSave,
  plannedNumbers,
  publishBlockers,
  replacementCandidates,
} from "@/lib/catalog/chapter-rules";
import type { AdminChapter, ChapterState } from "@/lib/catalog/types";

let counter = 0;
function chapter(
  id: string,
  number: number,
  state: ChapterState,
  extra: Partial<AdminChapter> = {},
): AdminChapter {
  counter += 1;
  return {
    id,
    courseId: "course-1",
    number,
    title: { ar: id, en: id },
    minutes: 20,
    lessonCount: 0,
    state,
    liveContentVersionId: null,
    counts: { sessions: 0, contentVersions: 0 },
    deletable: true,
    createdAt: `2026-10-15T00:00:${String(counter).padStart(2, "0")}.000Z`,
    ...extra,
  };
}
const course = { liveContentVersionId: "cv-1" };
const noCourseContent = { liveContentVersionId: null };

describe("groupChapters", () => {
  it("lists Coming soon and Published by number, then Drafts, then Archived", () => {
    const groups = groupChapters([
      chapter("d1", 2, "draft"),
      chapter("p3", 3, "published"),
      chapter("a1", 1, "archived"),
      chapter("c1", 1, "coming_soon"),
      chapter("p2", 2, "published"),
    ]);
    expect(groups.numbered.map((item) => item.id)).toEqual(["c1", "p2", "p3"]);
    expect(groups.drafts.map((item) => item.id)).toEqual(["d1"]);
    expect(groups.archived.map((item) => item.id)).toEqual(["a1"]);
  });

  it("orders Drafts that share a number by creation time", () => {
    const first = chapter("first", 1, "draft");
    const second = chapter("second", 1, "draft");
    expect(groupChapters([second, first]).drafts.map((item) => item.id)).toEqual(["first", "second"]);
  });

  it("returns empty groups for no Chapters", () => {
    expect(groupChapters([])).toEqual({ numbered: [], drafts: [], archived: [] });
  });
});

describe("nextChapterNumber", () => {
  it("is one after the highest Coming soon or Published number", () => {
    expect(nextChapterNumber([chapter("a", 1, "published"), chapter("b", 4, "coming_soon")])).toBe(5);
  });
  it("ignores Drafts and Archived Chapters, and starts at 1", () => {
    expect(nextChapterNumber([chapter("a", 9, "draft"), chapter("b", 7, "archived")])).toBe(1);
    expect(nextChapterNumber([])).toBe(1);
  });
});

describe("arranging the order", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves a Chapter to where another is", () => {
    expect(moveToId(ids, "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(moveToId(ids, "d", "a")).toEqual(["d", "a", "b", "c"]);
  });
  it("changes nothing for the same, or an unknown, id", () => {
    expect(moveToId(ids, "b", "b")).toBe(ids);
    expect(moveToId(ids, "x", "b")).toBe(ids);
    expect(moveToId(ids, "b", "x")).toBe(ids);
  });
  it("does not mutate its input", () => {
    moveToId(ids, "a", "d");
    moveBy(ids, "a", 1);
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("moves one step up or down, and stops at the ends", () => {
    expect(moveBy(ids, "c", -1)).toEqual(["a", "c", "b", "d"]);
    expect(moveBy(ids, "b", 1)).toEqual(["a", "c", "b", "d"]);
    expect(moveBy(ids, "a", -1)).toBe(ids);
    expect(moveBy(ids, "d", 1)).toBe(ids);
    expect(moveBy(ids, "x", 1)).toBe(ids);
  });

  it("detects a changed order and builds the full list to save", () => {
    expect(orderChanged(ids, ids)).toBe(false);
    expect(orderToSave(ids, ids)).toBeNull();
    const next = moveBy(ids, "a", 1);
    expect(orderChanged(ids, next)).toBe(true);
    expect(orderToSave(ids, next)).toEqual(["b", "a", "c", "d"]);
  });

  it("returns an order back to the start as unchanged", () => {
    expect(orderChanged(ids, moveBy(moveBy(ids, "a", 1), "a", -1))).toBe(false);
  });

  it("numbers the planned order from 1", () => {
    expect([...plannedNumbers(["b", "a", "c"])]).toEqual([
      ["b", 1],
      ["a", 2],
      ["c", 3],
    ]);
  });

  it("keeps the arrangement only while it is about the same Chapters as the server's", () => {
    const local = ["b", "a", "c", "d"];
    expect(effectiveOrder(local, ids)).toBe(local);
    expect(effectiveOrder(null, ids)).toBe(ids);
    // A Chapter left, joined or was swapped: the stale arrangement is dropped.
    expect(effectiveOrder(local, ["a", "b", "c"])).toEqual(["a", "b", "c"]);
    expect(effectiveOrder(local, ["a", "b", "c", "e"])).toEqual(["a", "b", "c", "e"]);
    expect(effectiveOrder(["a", "a", "b", "c"], ["a", "b", "c", "d"])).toEqual(["a", "b", "c", "d"]);
  });
});

describe("publishBlockers", () => {
  it("names what is missing, the Chapter's content first", () => {
    expect(publishBlockers({ liveContentVersionId: null }, noCourseContent)).toEqual([
      "chapterContent",
      "courseContent",
    ]);
    expect(publishBlockers({ liveContentVersionId: null }, course)).toEqual(["chapterContent"]);
    expect(publishBlockers({ liveContentVersionId: "v1" }, noCourseContent)).toEqual(["courseContent"]);
    expect(publishBlockers({ liveContentVersionId: "v1" }, course)).toEqual([]);
  });
});

describe("chapterStateMoves", () => {
  it("offers every other state, in Draft, Coming soon, Published, Archived order", () => {
    const item = chapter("a", 1, "published", { liveContentVersionId: "v1" });
    expect(chapterStateMoves(item, [item], course).map((move) => move.to)).toEqual([
      "draft",
      "coming_soon",
      "archived",
    ]);
    const draft = chapter("b", 1, "draft");
    expect(chapterStateMoves(draft, [draft], course).map((move) => move.to)).toEqual([
      "coming_soon",
      "published",
      "archived",
    ]);
    const archived = chapter("c", 1, "archived");
    expect(chapterStateMoves(archived, [archived], course).map((move) => move.to)).toEqual([
      "draft",
      "coming_soon",
      "published",
    ]);
  });

  it("needs no content for Coming soon, and both live versions for Published", () => {
    const draft = chapter("d", 1, "draft");
    const moves = chapterStateMoves(draft, [draft], noCourseContent);
    expect(moves.find((move) => move.to === "coming_soon")?.blockers).toEqual([]);
    expect(moves.find((move) => move.to === "archived")?.blockers).toEqual([]);
    expect(moves.find((move) => move.to === "published")?.blockers).toEqual([
      "chapterContent",
      "courseContent",
    ]);
  });

  it("lets a Draft with live content publish when the Course has content", () => {
    const draft = chapter("d", 1, "draft", { liveContentVersionId: "v1" });
    expect(chapterStateMoves(draft, [draft], course).find((move) => move.to === "published")?.blockers).toEqual(
      [],
    );
  });

  it("blocks Coming soon and Published when another live Chapter holds the number", () => {
    const live = chapter("live", 3, "published", { liveContentVersionId: "v1" });
    const draft = chapter("d", 3, "draft", { liveContentVersionId: "v2" });
    const moves = chapterStateMoves(draft, [live, draft], course);
    expect(moves.find((move) => move.to === "coming_soon")?.blockers).toEqual(["numberTaken"]);
    expect(moves.find((move) => move.to === "published")?.blockers).toEqual(["numberTaken"]);
    expect(moves.find((move) => move.to === "archived")?.blockers).toEqual([]);
  });

  it("does not count the Chapter itself, a Draft or an Archived Chapter as holding the number", () => {
    const published = chapter("p", 2, "published", { liveContentVersionId: "v1" });
    const sameNumberDraft = chapter("d", 2, "draft");
    const sameNumberArchived = chapter("a", 2, "archived");
    const moves = chapterStateMoves(published, [published, sameNumberDraft, sameNumberArchived], course);
    expect(moves.every((move) => move.blockers.length === 0)).toBe(true);
  });

  it("lists the number first and then the missing content when both apply", () => {
    const live = chapter("live", 1, "coming_soon");
    const draft = chapter("d", 1, "draft");
    expect(
      chapterStateMoves(draft, [live, draft], noCourseContent).find((move) => move.to === "published")
        ?.blockers,
    ).toEqual(["numberTaken", "chapterContent", "courseContent"]);
  });
});

describe("replacement", () => {
  const published = chapter("old", 2, "published", { liveContentVersionId: "v1" });
  const comingSoon = chapter("soon", 3, "coming_soon");

  it("applies to Coming soon and Published Chapters only", () => {
    expect(canReplace(published)).toBe(true);
    expect(canReplace(comingSoon)).toBe(true);
    expect(canReplace(chapter("d", 1, "draft"))).toBe(false);
    expect(canReplace(chapter("a", 1, "archived"))).toBe(false);
  });

  it("offers the Course's Drafts only", () => {
    const all = [
      published,
      comingSoon,
      chapter("draft-b", 5, "draft"),
      chapter("draft-a", 2, "draft", { liveContentVersionId: "v9" }),
      chapter("old-one", 1, "archived"),
      chapter("elsewhere", 4, "draft", { courseId: "course-2" }),
    ];
    expect(replacementCandidates(published, all, course).map((item) => item.chapter.id)).toEqual([
      "draft-a",
      "draft-b",
    ]);
  });

  it("marks a Draft that cannot take a Published place, and none for Coming soon", () => {
    const all = [
      published,
      comingSoon,
      chapter("with", 4, "draft", { liveContentVersionId: "v9" }),
      chapter("without", 5, "draft"),
    ];
    const forPublished = replacementCandidates(published, all, course);
    expect(forPublished.find((item) => item.chapter.id === "with")?.blockers).toEqual([]);
    expect(forPublished.find((item) => item.chapter.id === "without")?.blockers).toEqual(["chapterContent"]);
    const noContent = replacementCandidates(published, all, noCourseContent);
    expect(noContent.find((item) => item.chapter.id === "with")?.blockers).toEqual(["courseContent"]);
    const forComingSoon = replacementCandidates(comingSoon, all, noCourseContent);
    expect(forComingSoon.every((item) => item.blockers.length === 0)).toBe(true);
  });

  it("offers nothing for a Chapter that cannot be replaced", () => {
    const draft = chapter("d", 1, "draft");
    expect(replacementCandidates(draft, [draft, chapter("e", 2, "draft")], course)).toEqual([]);
  });
});

describe("chapterDeleteBlockers", () => {
  it("is empty when the backend says deletable", () => {
    expect(chapterDeleteBlockers(chapter("a", 1, "draft"))).toEqual([]);
  });
  it("names Sessions when there are some", () => {
    const used = chapter("a", 1, "published", {
      deletable: false,
      counts: { sessions: 4, contentVersions: 2 },
    });
    expect(chapterDeleteBlockers(used)).toEqual(["sessions"]);
  });
  it("names Content versions when nothing else explains it", () => {
    const uploaded = chapter("a", 1, "draft", {
      deletable: false,
      counts: { sessions: 0, contentVersions: 1 },
    });
    expect(chapterDeleteBlockers(uploaded)).toEqual(["contentVersions"]);
  });
});
