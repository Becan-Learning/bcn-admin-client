import type { AdminEnrollment, CatalogCourse } from "./detail-types";

// Active Enrollments are the ones without an end date; an ended one can be granted again.
export function activeEnrollments(enrollments: readonly AdminEnrollment[]): AdminEnrollment[] {
  return enrollments.filter((enrollment) => enrollment.endedAt === null);
}

// The Courses the picker offers: the Catalog minus those the Account already holds actively.
export function grantableCourses(
  catalog: readonly CatalogCourse[],
  enrollments: readonly AdminEnrollment[],
): CatalogCourse[] {
  const held = new Set(activeEnrollments(enrollments).map((enrollment) => enrollment.course.id));
  return catalog.filter((course) => !held.has(course.id));
}
