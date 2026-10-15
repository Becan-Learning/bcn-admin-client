import type { AdminChapter, AdminCourse } from "@/lib/catalog/types";

// The Chapter's Content versions section (AD4, #25): upload, validation report, set live, rollback. A
// slot: the Chapter page already renders it, so AD4 fills in this file and never edits the page.
export function ChapterContentVersionsSection(props: { chapter: AdminChapter; course: AdminCourse }) {
  void props;
  return null;
}
