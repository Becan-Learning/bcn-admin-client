import type { AdminCourse } from "@/lib/catalog/types";

// The Chapters section (AD3, #24): list, drag to reorder, states, replacement. A slot: the Course page
// already renders it, so AD3 fills in this file (it may be an async Server Component with its own
// fetch and <Suspense>) and never edits the page.
export function ChaptersSection(props: { course: AdminCourse }) {
  void props;
  return null;
}
