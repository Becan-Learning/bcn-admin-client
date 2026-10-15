import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlertCircleIcon, ArrowLeftIcon } from "lucide-react";
import { ChapterContentVersionsSection } from "@/components/catalog/chapters/detail/chapter-content-versions-section";
import { ChapterHeader } from "@/components/catalog/chapters/detail/chapter-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChapter, fetchCourse } from "@/lib/catalog/fetch";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ChapterDetail");
  return { title: t("title") };
}

// A Chapter's own page, reached from the Chapters list of its Course. It holds the Chapter's Content
// versions (AD4, #25), which fill the slot below; Chapter details and state are managed on the Course page.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, t, errors, incoming] = await Promise.all([
    params,
    getTranslations("ChapterDetail"),
    getTranslations("Errors"),
    headers(),
  ]);
  const chapter = await fetchChapter(id, incoming);
  if (!chapter.ok && chapter.errorKey === "CHAPTER_NOT_FOUND") notFound();
  const course = chapter.ok ? await fetchCourse(chapter.chapter.courseId, incoming) : null;

  const failed = !chapter.ok ? chapter : course && !course.ok ? course : null;
  if (failed && !failed.ok) {
    return (
      <>
        <Link
          href="/catalog/courses"
          className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {t("backToCourses")}
        </Link>
        <Alert variant="destructive" role="alert">
          <AlertCircleIcon />
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{errors(failed.errorKey)}</AlertDescription>
        </Alert>
      </>
    );
  }
  if (!chapter.ok || !course || !course.ok) return null;

  return (
    <>
      <Link
        href={`/catalog/courses/${encodeURIComponent(course.course.id)}`}
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-4" />
        {t("backToCourse")}
      </Link>
      <ChapterHeader chapter={chapter.chapter} course={course.course} />
      <ChapterContentVersionsSection chapter={chapter.chapter} course={course.course} />
    </>
  );
}
