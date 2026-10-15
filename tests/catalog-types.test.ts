import { describe, expect, it } from "vitest";
import {
  adminChapterSchema,
  adminChaptersResponseSchema,
  adminCourseSchema,
  adminCoursesResponseSchema,
  adminInstitutionsResponseSchema,
  adminMajorsResponseSchema,
  groupMajors,
  type AdminInstitution,
  type AdminMajor,
} from "@/lib/catalog/types";

const institution = (id: string, sortOrder = 0): AdminInstitution => ({
  id,
  name: { ar: id, en: id },
  sortOrder,
  counts: { majors: 0, courses: 0, accounts: 0 },
  createdAt: "2026-10-15T00:00:00.000Z",
});
const major = (id: string, institutionId: string): AdminMajor => ({
  id,
  institutionId,
  name: { ar: id, en: id },
  sortOrder: 0,
  counts: { accounts: 0 },
  createdAt: "2026-10-15T00:00:00.000Z",
});

describe("groupMajors", () => {
  it("puts each Major under its Institution and keeps both orders", () => {
    const grouped = groupMajors(
      [institution("a"), institution("b"), institution("c")],
      [major("a-1", "a"), major("b-1", "b"), major("a-2", "a")],
    );
    expect(grouped.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(grouped[0].majors.map((item) => item.id)).toEqual(["a-1", "a-2"]);
    expect(grouped[1].majors.map((item) => item.id)).toEqual(["b-1"]);
    expect(grouped[2].majors).toEqual([]);
  });

  it("leaves out a Major whose Institution is not in the list", () => {
    const grouped = groupMajors([institution("a")], [major("x-1", "x")]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].majors).toEqual([]);
  });
});

describe("response schemas", () => {
  it("accept the backend's shapes and drop unknown fields", () => {
    const institutions = adminInstitutionsResponseSchema.parse({
      institutions: [{ ...institution("ksu"), extra: true }],
    });
    expect(institutions.institutions[0]).not.toHaveProperty("extra");
    expect(adminMajorsResponseSchema.parse({ majors: [major("ksu-cs", "ksu")] }).majors).toHaveLength(1);
  });

  it("refuse a malformed response", () => {
    expect(adminInstitutionsResponseSchema.safeParse({ institutions: [{ id: "x" }] }).success).toBe(false);
    expect(adminMajorsResponseSchema.safeParse([]).success).toBe(false);
  });
});

describe("Course schemas", () => {
  const course = {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "calc-1",
    status: "published",
    code: "MATH101",
    name: { ar: "التفاضل", en: "Calculus 1" },
    institution: { id: "ksu", name: { ar: "جامعة", en: "KSU" } },
    icon: "atom",
    tone: "olive",
    sortOrder: 1,
    liveContentVersionId: null,
    counts: {
      chapters: { draft: 1, comingSoon: 2, published: 3, archived: 0 },
      enrollments: 4,
      activeEnrollments: 2,
      sessions: 9,
      contentVersions: 1,
    },
    deletable: false,
    createdAt: "2026-10-15T00:00:00.000Z",
  };

  it("accept the backend's shape and drop unknown fields", () => {
    const parsed = adminCoursesResponseSchema.parse({ courses: [{ ...course, extra: true }] });
    expect(parsed.courses[0]).not.toHaveProperty("extra");
    expect(parsed.courses[0].counts.chapters.comingSoon).toBe(2);
  });

  it("refuse a status, icon or tone the backend never sends", () => {
    expect(adminCourseSchema.safeParse({ ...course, status: "deleted" }).success).toBe(false);
    expect(adminCourseSchema.safeParse({ ...course, icon: "rocket" }).success).toBe(false);
    expect(adminCourseSchema.safeParse({ ...course, tone: "pink" }).success).toBe(false);
  });

  it("accept a live Content version id", () => {
    const parsed = adminCourseSchema.parse({ ...course, liveContentVersionId: "v-1" });
    expect(parsed.liveContentVersionId).toBe("v-1");
  });
});

describe("Chapter schemas", () => {
  const raw = {
    id: "ch-1",
    courseId: "c-1",
    number: 2,
    title: { ar: "النهايات", en: "Limits" },
    minutes: 20,
    lessonCount: 3,
    state: "coming_soon",
    liveContentVersionId: null,
    counts: { sessions: 0, contentVersions: 0 },
    deletable: true,
    createdAt: "2026-10-15T00:00:00.000Z",
  };

  it("accept the backend's shape and drop unknown fields", () => {
    const parsed = adminChaptersResponseSchema.parse({ chapters: [{ ...raw, extra: 1 }] });
    expect(parsed.chapters[0]).toEqual(raw);
    expect(adminChapterSchema.parse({ ...raw, state: "published", liveContentVersionId: "v1" }).liveContentVersionId).toBe(
      "v1",
    );
  });

  it("refuse an unknown state or a missing live version field", () => {
    expect(adminChapterSchema.safeParse({ ...raw, state: "live" }).success).toBe(false);
    const { liveContentVersionId, ...without } = raw;
    void liveContentVersionId;
    expect(adminChapterSchema.safeParse(without).success).toBe(false);
  });
});
