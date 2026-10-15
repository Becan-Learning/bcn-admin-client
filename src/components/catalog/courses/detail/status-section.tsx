"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/accounts/detail/confirm-dialog";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setCourseStatus } from "@/lib/catalog/api";
import { courseStatusMoves, type CourseStatusMove } from "@/lib/catalog/course-rules";
import type { AdminCourse } from "@/lib/catalog/types";
import { CourseStatusBadge } from "../course-status-badge";

// The Status section: one button per allowed move (Draft, Published, Archived), each behind a confirm
// dialog that says what it does. The backend has the last word: back to Draft while a Chapter is
// Published is 409 PUBLISH_PRECONDITION, and leaving Archived onto a slug another active Course holds is
// 409 SLUG_TAKEN. Both are shown in the dialog with what to do next.
export function CourseStatusSection({ course }: { course: AdminCourse }) {
  const t = useTranslations("CourseDetail.status");
  const action = useAccountAction();
  const [open, setOpen] = useState(false);
  const [move, setMove] = useState<CourseStatusMove | null>(null);

  const moves = courseStatusMoves(course.status, course.counts.chapters);

  // The dialog closes once the change succeeded and the refreshed page has arrived.
  const { done, pending } = action;
  const dialogOpen = open && !(done !== null && !pending);

  function ask(next: CourseStatusMove) {
    action.reset();
    setMove(next);
    setOpen(true);
  }

  const key = move?.to ?? "draft";
  const description = move
    ? move.leavesArchived
      ? `${t(`moves.${key}.description`)} ${t("leavesArchived")}`
      : t(`moves.${key}.description`)
    : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("current")}</span>
          <CourseStatusBadge status={course.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {moves.map((item) => (
            <Button
              key={item.to}
              type="button"
              variant="outline"
              disabled={item.blocked !== null}
              aria-describedby={item.blocked ? "course-status-blocked" : undefined}
              onClick={() => ask(item)}
            >
              {t(`moves.${item.to}.action`)}
            </Button>
          ))}
        </div>
        {moves.some((item) => item.blocked === "publishedChapters") ? (
          <p id="course-status-blocked" className="text-sm text-muted-foreground">
            {t("blockedPublishedChapters")}
          </p>
        ) : null}
        {done && !dialogOpen ? (
          <p role="status" className="text-sm text-muted-foreground">
            {done}
          </p>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setOpen}
        title={t(`moves.${key}.title`)}
        description={description}
        confirmLabel={t(`moves.${key}.confirm`)}
        pendingLabel={t("pending")}
        pending={action.pending}
        errorKey={action.errorKey}
        onConfirm={() => {
          if (!move) return;
          void action.run(() => setCourseStatus(course.id, move.to), t("updated"));
        }}
        errorAction={
          action.errorKey === "PUBLISH_PRECONDITION" ? (
            <p className="text-sm text-muted-foreground">{t("preconditionHelp")}</p>
          ) : action.errorKey === "SLUG_TAKEN" ? (
            <p className="text-sm text-muted-foreground">{t("slugTakenHelp")}</p>
          ) : null
        }
      />
    </Card>
  );
}
