import { describe, expect, it } from "vitest";
import {
  changesSlug,
  courseCreateBody,
  courseValues,
  diffCourse,
  EMPTY_COURSE_VALUES,
  validateCourseForm,
  type CourseValues,
} from "@/lib/catalog/course-form";
import type { AdminCourse } from "@/lib/catalog/types";

const course: AdminCourse = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "calc-1",
  status: "draft",
  code: "MATH101",
  name: { ar: "التفاضل", en: "Calculus 1" },
  institution: { id: "ksu", name: { ar: "جامعة", en: "KSU" } },
  icon: "atom",
  tone: "olive",
  sortOrder: 4,
  liveContentVersionId: null,
  counts: {
    chapters: { draft: 0, comingSoon: 0, published: 0, archived: 0 },
    enrollments: 0,
    activeEnrollments: 0,
    sessions: 0,
    contentVersions: 0,
  },
  deletable: true,
  createdAt: "2026-10-15T00:00:00.000Z",
};

const valid: CourseValues = {
  slug: "calc-1",
  code: "MATH101",
  nameEn: "Calculus 1",
  nameAr: "التفاضل",
  institutionId: "ksu",
  icon: "atom",
  tone: "olive",
  sortOrder: "4",
};

describe("courseValues", () => {
  it("turns a Course into form strings", () => {
    expect(courseValues(course)).toEqual(valid);
  });
});

describe("validateCourseForm", () => {
  it("accepts a complete form", () => {
    expect(validateCourseForm(valid)).toEqual({});
  });

  it("asks for everything on an empty form except the sort order", () => {
    expect(validateCourseForm(EMPTY_COURSE_VALUES)).toEqual({
      slug: "required",
      code: "required",
      nameEn: "required",
      nameAr: "required",
      institutionId: "required",
      icon: "required",
      tone: "required",
    });
  });

  it("checks the slug pattern, the lengths and the sort order", () => {
    expect(validateCourseForm({ ...valid, slug: "Calc 1" }).slug).toBe("invalidId");
    expect(validateCourseForm({ ...valid, slug: "-calc" }).slug).toBe("invalidId");
    expect(validateCourseForm({ ...valid, slug: " calc-1 " }).slug).toBeUndefined();
    expect(validateCourseForm({ ...valid, code: "x".repeat(41) }).code).toBe("tooLong");
    expect(validateCourseForm({ ...valid, nameEn: "x".repeat(201) }).nameEn).toBe("tooLong");
    expect(validateCourseForm({ ...valid, nameAr: "   " }).nameAr).toBe("required");
    expect(validateCourseForm({ ...valid, sortOrder: "-1" }).sortOrder).toBe("invalidSortOrder");
    expect(validateCourseForm({ ...valid, sortOrder: "" }).sortOrder).toBe("invalidSortOrder");
  });

  it("refuses an icon or tone outside the backend's sets", () => {
    expect(validateCourseForm({ ...valid, icon: "rocket" }).icon).toBe("required");
    expect(validateCourseForm({ ...valid, tone: "pink" }).tone).toBe("required");
  });
});

describe("courseCreateBody", () => {
  it("trims the text and parses the sort order", () => {
    expect(
      courseCreateBody({ ...valid, slug: " new-course ", code: " C1 ", nameEn: " A ", nameAr: " ب ", sortOrder: "12" }),
    ).toEqual({
      slug: "new-course",
      code: "C1",
      nameEn: "A",
      nameAr: "ب",
      institutionId: "ksu",
      icon: "atom",
      tone: "olive",
      sortOrder: 12,
    });
  });

  it("is null for a form that is not valid", () => {
    expect(courseCreateBody(EMPTY_COURSE_VALUES)).toBeNull();
    expect(courseCreateBody({ ...valid, sortOrder: "x" })).toBeNull();
  });
});

describe("diffCourse", () => {
  it("is empty when nothing changed, even if only spaces were added", () => {
    expect(diffCourse(valid, valid)).toEqual({});
    expect(diffCourse(valid, { ...valid, nameEn: " Calculus 1 ", slug: "calc-1 " })).toEqual({});
  });

  it("sends only the changed fields", () => {
    expect(diffCourse(valid, { ...valid, nameEn: "Calculus I" })).toEqual({ nameEn: "Calculus I" });
    expect(
      diffCourse(valid, { ...valid, institutionId: "kfupm", icon: "bolt", tone: "deep", sortOrder: "9" }),
    ).toEqual({ institutionId: "kfupm", icon: "bolt", tone: "deep", sortOrder: 9 });
    expect(diffCourse(valid, { ...valid, slug: "calculus-1", code: "MATH102" })).toEqual({
      slug: "calculus-1",
      code: "MATH102",
    });
  });

  it("leaves out a field that does not parse", () => {
    expect(diffCourse(valid, { ...valid, sortOrder: "abc", icon: "rocket", tone: "", institutionId: "" })).toEqual({});
  });

  it("never carries the id or the status", () => {
    const keys = Object.keys(
      diffCourse(valid, {
        slug: "x",
        code: "x",
        nameEn: "x",
        nameAr: "x",
        institutionId: "x",
        icon: "bolt",
        tone: "deep",
        sortOrder: "1",
      }),
    );
    expect(keys.sort()).toEqual(
      ["code", "icon", "institutionId", "nameAr", "nameEn", "slug", "sortOrder", "tone"].sort(),
    );
  });
});

describe("changesSlug", () => {
  it("is true only when the slug is in the changes", () => {
    expect(changesSlug({ slug: "x" })).toBe(true);
    expect(changesSlug({ code: "x" })).toBe(false);
    expect(changesSlug({})).toBe(false);
  });
});
