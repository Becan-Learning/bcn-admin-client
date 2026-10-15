import { ContentVersionsSection } from "@/components/catalog/content/content-versions-data";
import type { AdminCourse } from "@/lib/catalog/types";

// The Course content versions section (AD4, #25): the Course-level files (the knowledge schema and the cast),
// uploaded, validated, set live and rolled back like a Chapter's, without the preview link. The Course page
// already renders this slot, so AD4 fills in this file and never edits the page.
export function CourseContentVersionsSection({ course }: { course: AdminCourse }) {
  return <ContentVersionsSection kind="course" ownerId={course.id} />;
}
