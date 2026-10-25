"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCount, splitDuration } from "@/lib/insights/format";
import type { CourseRow } from "@/lib/insights/types";
import { cn } from "@/lib/utils";
import { ExpandToggle } from "./expand-toggle";
import { LocalizedName } from "./localized-name";

// Every Course, in the order the API sends (most Held Sessions first), each opening to its Chapters.
// Rows with no use stay visible, with muted zeros: seeing what is not used is the point.
export function CoursesTable({ courses }: { courses: CourseRow[] }) {
  const t = useTranslations("Insights.courses");
  const insights = useTranslations("Insights");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("course")}</TableHead>
                <TableHead className="text-end">{t("heldSessions")}</TableHead>
                <TableHead className="text-end">{t("studyTime")}</TableHead>
                <TableHead className="text-end">{t("activeStudents")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {courses.map((course) => {
                const expanded = open.has(course.id);
                const label = `${course.code} ${course.name.en}`;
                return (
                  <Fragment key={course.id}>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <ExpandToggle
                            expanded={expanded}
                            label={t(expanded ? "collapse" : "expand", { name: label })}
                            onToggle={() => toggle(course.id)}
                          />
                          <LocalizedName prefix={course.code} name={course.name} />
                        </div>
                      </TableCell>
                      <Metrics
                        heldSessions={course.heldSessions}
                        studySeconds={course.studySeconds}
                        activeStudents={course.activeStudents}
                        duration={(value) => insights("duration", splitDuration(value))}
                      />
                    </TableRow>
                    {expanded && course.chapters.length === 0 ? (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={4} className="ps-12 text-muted-foreground">
                          {t("noChapters")}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {expanded
                      ? course.chapters.map((chapter) => (
                          <TableRow key={chapter.number} className="bg-muted/30">
                            <TableCell className="ps-12">
                              <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                                <LocalizedName
                                  prefix={t("chapter", { number: chapter.number })}
                                  name={chapter.title}
                                />
                                {!chapter.published ? (
                                  <Badge variant="outline">{t("unpublished")}</Badge>
                                ) : null}
                              </div>
                            </TableCell>
                            <Metrics
                              heldSessions={chapter.heldSessions}
                              studySeconds={chapter.studySeconds}
                              activeStudents={chapter.activeStudents}
                              duration={(value) => insights("duration", splitDuration(value))}
                            />
                          </TableRow>
                        ))
                      : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Metrics({
  heldSessions,
  studySeconds,
  activeStudents,
  duration,
}: {
  heldSessions: number;
  studySeconds: number;
  activeStudents: number;
  duration: (seconds: number) => string;
}) {
  const cell = (value: number, text: string) => (
    <TableCell className={cn("text-end tabular-nums", value === 0 && "text-muted-foreground")}>{text}</TableCell>
  );
  return (
    <>
      {cell(heldSessions, formatCount(heldSessions))}
      {cell(studySeconds, duration(studySeconds))}
      {cell(activeStudents, formatCount(activeStudents))}
    </>
  );
}
