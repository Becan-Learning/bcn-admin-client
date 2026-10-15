import { ContentVersionsSection } from "@/components/catalog/content/content-versions-data";
import type { AdminChapter, AdminCourse } from "@/lib/catalog/types";

// The Chapter's Content versions section (AD4, #25): upload, validation report, set live, rollback, delete and
// the "Preview in student app" link (`/session/{courseSlug}/{chapterId}?version=...`). The Chapter page
// already renders this slot, so AD4 fills in this file and never edits the page.
export function ChapterContentVersionsSection({ chapter, course }: { chapter: AdminChapter; course: AdminCourse }) {
  return (
    <ContentVersionsSection
      kind="chapter"
      ownerId={chapter.id}
      preview={{ courseSlug: course.slug, chapterId: chapter.id }}
    />
  );
}
