import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChapterStateBadge } from "@/components/catalog/chapter-state-badge";
import { hasLiveContent } from "@/lib/catalog/chapter-rules";
import type { AdminChapter, AdminCourse } from "@/lib/catalog/types";
import { CopyButton } from "../../courses/detail/copy-button";

// The names and the facts an Admin wants at a glance: number, state, Course (linked), length, lessons,
// whether live content exists, and the UUID (read-only, copyable).
export function ChapterHeader({ chapter, course }: { chapter: AdminChapter; course: AdminCourse }) {
  const t = useTranslations("ChapterDetail.header");
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            <bdi>{chapter.title.en}</bdi>
          </h1>
          <ChapterStateBadge state={chapter.state} />
        </div>
        <p lang="ar" className="text-lg text-muted-foreground break-words">
          <bdi>{chapter.title.ar}</bdi>
        </p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("chapterNumber", { number: chapter.number })}
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">{t("course")}</dt>
        <dd className="break-words">
          <Link
            href={`/catalog/courses/${encodeURIComponent(course.id)}`}
            className="underline-offset-4 hover:underline"
          >
            <bdi>{course.name.en}</bdi>
          </Link>{" "}
          <span className="text-muted-foreground">·</span>{" "}
          <span lang="ar">
            <bdi>{course.name.ar}</bdi>
          </span>
        </dd>
        <dt className="text-muted-foreground">{t("minutes")}</dt>
        <dd>{t("minutesValue", { minutes: chapter.minutes })}</dd>
        <dt className="text-muted-foreground">{t("lessons")}</dt>
        <dd>{chapter.lessonCount}</dd>
        <dt className="text-muted-foreground">{t("content")}</dt>
        <dd>{hasLiveContent(chapter) ? t("contentLive") : t("contentNone")}</dd>
        <dt className="text-muted-foreground">{t("id")}</dt>
        <dd className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-1">
            <code dir="ltr" className="font-mono text-xs break-all">
              {chapter.id}
            </code>
            <CopyButton value={chapter.id} label={t("copyLabel")} />
          </span>
          <span className="text-xs text-muted-foreground">{t("idHelp")}</span>
        </dd>
      </dl>
    </header>
  );
}
