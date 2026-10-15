import type { AdminCourse } from "@/lib/catalog/types";

// The Course content versions section (AD4, #25): upload, validation report, set live, rollback. A
// slot: the Course page already renders it, so AD4 fills in this file and never edits the page.
export function CourseContentVersionsSection(props: { course: AdminCourse }) {
  void props;
  return null;
}
