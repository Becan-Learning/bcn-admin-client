// What an Admin may do to a Course, as pure functions: the status moves, the delete confirmation and the
// Chapter counts line. The backend decides in the end (409 `PUBLISH_PRECONDITION`, `SLUG_TAKEN`,
// `COURSE_IN_USE`); these only keep the buttons honest.
import { COURSE_STATUSES, type AdminCourse, type CourseStatus } from "./types";

export type CourseStatusMove = {
  to: CourseStatus;
  // Leaving Archived makes the slug count again: another non-Archived Course using it answers 409
  // `SLUG_TAKEN`.
  leavesArchived: boolean;
  // Back to Draft is refused while the Course has a Published Chapter (409 `PUBLISH_PRECONDITION`).
  // The button is shown but off, with the reason.
  blocked: "publishedChapters" | null;
};

// Every status except the current one, in Draft, Published, Archived order. Archiving is always allowed.
export function courseStatusMoves(
  status: CourseStatus,
  counts: Pick<AdminCourse["counts"]["chapters"], "published">,
): CourseStatusMove[] {
  return COURSE_STATUSES.filter((to) => to !== status).map((to) => ({
    to,
    leavesArchived: status === "archived",
    blocked: to === "draft" && counts.published > 0 ? "publishedChapters" : null,
  }));
}

// Deleting asks the Admin to type the Course's slug. Exact match: a slug is lower case, so a near miss
// is a different word. Surrounding spaces from a paste are ignored.
export function slugConfirmationMatches(typed: string, slug: string): boolean {
  return typed.trim() === slug;
}

// Why a Course cannot be deleted, for the line that points to Archive. The backend's rule is: no
// Enrollment ever, no Session ever, and no Content version ever live or uploaded to Bunny. The counts name
// the first two. The version rule has no count of its own, so it is named only when it must be the reason:
// the backend says the Course is not deletable and neither count explains it.
export type DeleteBlocker = "enrollments" | "sessions" | "contentVersions";

export function deleteBlockers(course: Pick<AdminCourse, "counts" | "deletable">): DeleteBlocker[] {
  if (course.deletable) return [];
  const blockers: DeleteBlocker[] = [];
  if (course.counts.enrollments > 0) blockers.push("enrollments");
  if (course.counts.sessions > 0) blockers.push("sessions");
  if (blockers.length === 0) blockers.push("contentVersions");
  return blockers;
}

export type ChapterCountPart = { state: keyof AdminCourse["counts"]["chapters"]; count: number };

// The non-zero Chapter counts of a Course, Published first. Empty means no Chapters at all.
export function chapterCountParts(chapters: AdminCourse["counts"]["chapters"]): ChapterCountPart[] {
  const order: ChapterCountPart["state"][] = ["published", "comingSoon", "draft", "archived"];
  return order
    .map((state) => ({ state, count: chapters[state] }))
    .filter((part) => part.count > 0);
}
