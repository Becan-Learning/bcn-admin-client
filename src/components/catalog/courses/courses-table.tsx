"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  columnVisibilityFeature,
  createColumnHelper,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { chapterCountParts } from "@/lib/catalog/course-rules";
import type { AdminCourse } from "@/lib/catalog/types";
import { LocalizedName } from "../localized-name";
import { CourseStatusBadge } from "./course-status-badge";

// The backend already filtered and ordered the Courses, so the table only displays them: no row models
// and no sorting or paging features (`getVisibleCells` needs the column visibility one).
const features = tableFeatures({ columnVisibilityFeature });
const columnHelper = createColumnHelper<typeof features, AdminCourse>();

// "3 published, 2 coming soon": the non-zero counts, Published first.
function ChapterCounts({ counts }: { counts: AdminCourse["counts"]["chapters"] }) {
  const t = useTranslations("Catalog.courses.chapters");
  const parts = chapterCountParts(counts);
  if (parts.length === 0) return <span className="text-muted-foreground">{t("none")}</span>;
  return (
    <span className="flex flex-col">
      {parts.map((part) => (
        <span key={part.state} className={part.state === "published" ? undefined : "text-muted-foreground"}>
          {t(part.state, { count: part.count })}
        </span>
      ))}
    </span>
  );
}

export function CoursesTable({ courses }: { courses: AdminCourse[] }) {
  const t = useTranslations("Catalog.courses");
  const chapters = useTranslations("Catalog.courses.chapters");
  const router = useRouter();

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("code", {
          header: t("columns.code"),
          cell: ({ row }) => (
            <code dir="ltr" className="font-mono text-xs break-all">
              {row.original.code}
            </code>
          ),
        }),
        columnHelper.display({
          id: "name",
          header: t("columns.course"),
          cell: ({ row }) => {
            const course = row.original;
            const parts = chapterCountParts(course.counts.chapters);
            return (
              <div className="flex min-w-0 flex-col gap-1">
                <Link
                  href={`/catalog/courses/${encodeURIComponent(course.id)}`}
                  className="w-fit font-medium break-words hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {course.name.en}
                </Link>
                <span lang="ar" className="text-xs text-muted-foreground break-words">
                  <bdi>{course.name.ar}</bdi>
                </span>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground lg:hidden">
                  <code dir="ltr" className="font-mono">
                    {course.slug}
                  </code>
                  <span>{course.institution.name.en}</span>
                  <span>
                    {parts.length === 0
                      ? chapters("none")
                      : parts.map((part) => chapters(part.state, { count: part.count })).join(", ")}
                  </span>
                </p>
              </div>
            );
          },
        }),
        columnHelper.accessor("slug", {
          header: t("columns.slug"),
          cell: ({ row }) => (
            <code dir="ltr" className="font-mono text-xs break-all">
              {row.original.slug}
            </code>
          ),
        }),
        columnHelper.display({
          id: "institution",
          header: t("columns.institution"),
          cell: ({ row }) => <LocalizedName name={row.original.institution.name} />,
        }),
        columnHelper.accessor("status", {
          header: t("columns.status"),
          cell: ({ row }) => <CourseStatusBadge status={row.original.status} />,
        }),
        columnHelper.display({
          id: "chapters",
          header: t("columns.chapters"),
          cell: ({ row }) => <ChapterCounts counts={row.original.counts.chapters} />,
        }),
      ]),
    [t, chapters],
  );

  const table = useTable({ features, data: courses, columns, getRowId: (course) => course.id });

  // Which columns drop away on a narrow screen. The Course cell repeats what they hold, beneath the name.
  const hideBelow: Record<string, string> = {
    slug: "hidden lg:table-cell",
    institution: "hidden xl:table-cell",
    chapters: "hidden lg:table-cell",
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={hideBelow[header.column.id]}>
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={(event) => {
                  // The name is a real link (keyboard, middle click); the rest of the row is a
                  // larger target for the same destination.
                  if ((event.target as HTMLElement).closest("a, button")) return;
                  router.push(`/catalog/courses/${encodeURIComponent(row.original.id)}`);
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={
                      cell.column.id === "name"
                        ? "max-w-0 min-w-36 whitespace-normal"
                        : `whitespace-normal ${hideBelow[cell.column.id] ?? ""}`
                    }
                  >
                    <table.FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
