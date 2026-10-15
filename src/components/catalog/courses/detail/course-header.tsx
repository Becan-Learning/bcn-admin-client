import { useTranslations } from "next-intl";
import type { AdminCourse } from "@/lib/catalog/types";
import { CourseStatusBadge } from "../course-status-badge";
import { CopyButton } from "./copy-button";

// The names and the facts an Admin wants at a glance: code, slug, Institution, status, and the UUID
// (read-only, copyable). The UUID never changes; the slug can.
export function CourseHeader({ course }: { course: AdminCourse }) {
  const t = useTranslations("CourseDetail.header");
  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight break-words">
            <bdi>{course.name.en}</bdi>
          </h1>
          <CourseStatusBadge status={course.status} />
        </div>
        <p lang="ar" className="text-lg text-muted-foreground break-words">
          <bdi>{course.name.ar}</bdi>
        </p>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">{t("code")}</dt>
        <dd>
          <code dir="ltr" className="font-mono">
            {course.code}
          </code>
        </dd>
        <dt className="text-muted-foreground">{t("slug")}</dt>
        <dd>
          <code dir="ltr" className="font-mono break-all">
            {course.slug}
          </code>
        </dd>
        <dt className="text-muted-foreground">{t("institution")}</dt>
        <dd className="break-words">
          {course.institution.name.en} <span className="text-muted-foreground">·</span>{" "}
          <span lang="ar">
            <bdi>{course.institution.name.ar}</bdi>
          </span>
        </dd>
        <dt className="text-muted-foreground">{t("id")}</dt>
        <dd className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-x-1">
            <code dir="ltr" className="font-mono text-xs break-all">
              {course.id}
            </code>
            <CopyButton value={course.id} label={t("copyLabel")} />
          </span>
          <span className="text-xs text-muted-foreground">{t("idHelp")}</span>
        </dd>
      </dl>
    </header>
  );
}
