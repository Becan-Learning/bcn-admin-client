import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { CoursesSkeleton } from "@/components/catalog/courses/courses-skeleton";
import { CoursesView } from "@/components/catalog/courses/courses-view";
import { PageHeader } from "@/components/shell/page-header";
import type { RawSearchParams } from "@/lib/accounts/query-state";
import { parseCoursesSearchParams } from "@/lib/catalog/course-query-state";
import { fetchAdminInstitutions, fetchCourses } from "@/lib/catalog/fetch";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pages.catalogCourses");
  return { title: t("title") };
}

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const t = await getTranslations("Pages.catalogCourses");
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<CoursesSkeleton />}>
        <Courses searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Fetches on the server with the visitor's cookie forwarded, inside this Suspense boundary (the same
// pattern as the Accounts list): `searchParams` and `headers()` are request-time reads, and the boundary
// gives the loading skeleton. The URL is the only list state, so a filter change is a navigation that
// re-runs this component. The backend list is not paged, so every match is shown. The Institutions feed
// the filter and the Add dialog; if they fail the list still renders.
async function Courses({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const state = parseCoursesSearchParams(await searchParams);
  const incoming = await headers();
  const [result, institutions] = await Promise.all([
    fetchCourses(state, incoming),
    fetchAdminInstitutions(incoming),
  ]);
  return (
    <CoursesView
      state={state}
      institutions={institutions.ok ? institutions.institutions : null}
      result={result}
    />
  );
}
