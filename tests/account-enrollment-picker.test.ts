import { describe, expect, it } from "vitest";
import type { AdminEnrollment, CatalogCourse } from "@/lib/accounts/detail-types";
import { activeEnrollments, grantableCourses } from "@/lib/accounts/enrollment-picker";

const course = (id: string): CatalogCourse => ({ id, code: id.toUpperCase(), name: { ar: id, en: id } });
const enrollment = (courseId: string, endedAt: string | null): AdminEnrollment => ({
  id: `e-${courseId}-${endedAt ?? "active"}`,
  course: course(courseId),
  enrolledAt: "2026-10-01T00:00:00.000Z",
  endedAt,
  endReason: endedAt ? "ended_by_admin" : null,
});

describe("grantableCourses", () => {
  const catalog = [course("a"), course("b"), course("c")];

  it("removes Courses held actively", () => {
    expect(grantableCourses(catalog, [enrollment("b", null)]).map((c) => c.id)).toEqual(["a", "c"]);
  });

  it("keeps Courses whose Enrollment has ended", () => {
    const ended = [enrollment("a", "2026-10-02T00:00:00.000Z")];
    expect(grantableCourses(catalog, ended).map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("removes a Course with both an ended and an active Enrollment", () => {
    const both = [enrollment("a", "2026-10-02T00:00:00.000Z"), enrollment("a", null)];
    expect(grantableCourses(catalog, both).map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("returns nothing when every Course is held, and keeps Catalog order", () => {
    expect(grantableCourses(catalog, catalog.map((c) => enrollment(c.id, null)))).toEqual([]);
    expect(grantableCourses(catalog, [])).toEqual(catalog);
  });
});

describe("activeEnrollments", () => {
  it("keeps only Enrollments without an end date", () => {
    const all = [enrollment("a", null), enrollment("b", "2026-10-02T00:00:00.000Z")];
    expect(activeEnrollments(all).map((e) => e.course.id)).toEqual(["a"]);
  });
});
