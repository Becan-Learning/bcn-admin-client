"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/accounts/detail/confirm-dialog";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { setChapterState } from "@/lib/catalog/api";
import { isNumbered, type ChapterStateMove } from "@/lib/catalog/chapter-rules";
import type { AdminChapter } from "@/lib/catalog/types";

// Confirms one state move and says what it does. A move the data already shows cannot work (the number is
// held, or live content is missing) lists exactly why and keeps the confirm button off; the backend has the
// last word, so 409 PUBLISH_PRECONDITION and CHAPTER_NUMBER_TAKEN are still shown if the page was stale.
// Mount it only while it is open.
export function ChapterStateDialog({
  chapter,
  move,
  onClose,
}: {
  chapter: AdminChapter;
  move: ChapterStateMove;
  onClose: () => void;
}) {
  const t = useTranslations("CourseDetail.chapters.state");
  const action = useAccountAction();
  const to = move.to;

  // Once the change succeeded and the refreshed list has arrived, close.
  const { done, pending } = action;
  useEffect(() => {
    if (done !== null && !pending) onClose();
  }, [done, pending, onClose]);

  const parts = [t(`moves.${to}.description`)];
  if (isNumbered(chapter.state) && !isNumbered(to)) parts.push(t("leavesNumbered"));
  if (!isNumbered(chapter.state) && isNumbered(to)) parts.push(t("joinsNumbered", { number: chapter.number }));

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={t(`moves.${to}.title`)}
      description={parts.join(" ")}
      confirmLabel={t(`moves.${to}.confirm`)}
      pendingLabel={t("pending")}
      pending={action.pending}
      errorKey={action.errorKey}
      confirmDisabled={move.blockers.length > 0}
      onConfirm={() => void action.run(() => setChapterState(chapter.id, to), t("updated"))}
      errorAction={
        action.errorKey === "PUBLISH_PRECONDITION" ? (
          <p className="text-sm text-muted-foreground">{t("preconditionStale")}</p>
        ) : action.errorKey === "CHAPTER_NUMBER_TAKEN" ? (
          <p className="text-sm text-muted-foreground">{t("numberTakenHelp")}</p>
        ) : null
      }
    >
      {move.blockers.length > 0 ? (
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{t("blockedIntro")}</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {move.blockers.map((blocker) => (
              <li key={blocker}>{t(`blockers.${blocker}`, { number: chapter.number })}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </ConfirmDialog>
  );
}
