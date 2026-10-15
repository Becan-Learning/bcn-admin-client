import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react";
import { ChaptersSection } from "@/components/catalog/courses/detail/chapters-section";
import { CourseContentVersionsSection } from "@/components/catalog/courses/detail/content-versions-section";
import { CourseHeader } from "@/components/catalog/courses/detail/course-header";
import { CourseDeleteSection } from "@/components/catalog/courses/detail/delete-section";
import { CourseDetailsSection } from "@/components/catalog/courses/detail/details-section";
import { CourseStatusSection } from "@/components/catalog/courses/detail/status-section";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAdminInstitutions, fetchCourse } from "@/lib/catalog/fetch";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CourseDetail");
  return { title: t("title") };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("CourseDetail");
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Link
        href="/catalog/courses"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t("backToList")}
      </Link>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

// Reads the cookie, so it sits inside <Suspense>. The header comes first, then one component per
// section, each in its own file under components/catalog/courses/detail/. `ChaptersSection` (AD3, #24)
// and `CourseContentVersionsSection` (AD4, #25) are slots that return null until their issues fill them
// in, so those issues never edit this page. Delete is last: it is the one action that cannot be undone.
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, t, errors, incoming] = await Promise.all([
    params,
    getTranslations("CourseDetail"),
    getTranslations("Errors"),
    headers(),
  ]);
  const [result, institutions] = await Promise.all([
    fetchCourse(id, incoming),
    fetchAdminInstitutions(incoming),
  ]);

  if (!result.ok && result.errorKey === "COURSE_NOT_FOUND") notFound();

  if (!result.ok) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertCircleIcon />
        <AlertTitle>{t("errorTitle")}</AlertTitle>
        <AlertDescription>{errors(result.errorKey)}</AlertDescription>
      </Alert>
    );
  }

  const { course } = result;
  return (
    <>
      <CourseHeader course={course} />
      <CourseDetailsSection
        course={course}
        institutions={institutions.ok ? institutions.institutions : null}
      />
      <CourseStatusSection course={course} />
      <ChaptersSection course={course} />
      <CourseContentVersionsSection course={course} />
      <CourseDeleteSection course={course} />
    </>
  );
}
