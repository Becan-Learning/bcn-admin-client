import { Suspense } from "react";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { SectionError, SectionSkeleton } from "@/components/accounts/detail/section-states";
import { fetchChapters } from "@/lib/catalog/fetch";
import type { AdminCourse } from "@/lib/catalog/types";
import { ChaptersCard } from "./chapters/chapters-card";

// The Chapters section (AD3, #24): list, drag to reorder, create and edit, states, replacement and delete.
// It loads its own data (`GET /admin/courses/:id/chapters`, every state) inside its own <Suspense>, so a
// failure here leaves the rest of the Course page alone. The Course page renders this and never changes.
export async function ChaptersSection({ course }: { course: AdminCourse }) {
  const t = await getTranslations("CourseDetail.chapters");
  return (
    <Suspense fallback={<SectionSkeleton label={t("loading")} />}>
      <ChaptersData course={course} />
    </Suspense>
  );
}

async function ChaptersData({ course }: { course: AdminCourse }) {
  const [t, errors, incoming] = await Promise.all([
    getTranslations("CourseDetail.chapters"),
    getTranslations("Errors"),
    headers(),
  ]);
  const result = await fetchChapters(course.id, incoming);
  if (!result.ok) return <SectionError title={t("loadFailed")} message={errors(result.errorKey)} />;
  return <ChaptersCard course={course} chapters={result.chapters} />;
}
