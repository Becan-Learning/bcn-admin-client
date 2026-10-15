"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/accounts/detail/confirm-dialog";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { replaceChapter } from "@/lib/catalog/api";
import { replacementCandidates } from "@/lib/catalog/chapter-rules";
import type { AdminChapter, AdminCourse } from "@/lib/catalog/types";
import { cn } from "@/lib/utils";

// Picks one of the Course's Drafts to take over a Coming soon or Published Chapter. The Draft takes the
// number and the state, and the old Chapter is archived, all in one step. A Draft that cannot take a
// Published place (no live Chapter content, or the Course has none) is listed but off, with the reason.
// 409 REPLACEMENT_INVALID and PUBLISH_PRECONDITION are still shown if the page was stale. Mount it only
// while it is open.
export function ChapterReplaceDialog({
  chapter,
  chapters,
  course,
  onClose,
}: {
  chapter: AdminChapter;
  chapters: AdminChapter[];
  course: Pick<AdminCourse, "liveContentVersionId">;
  onClose: () => void;
}) {
  const t = useTranslations("CourseDetail.chapters.replace");
  const states = useTranslations("Catalog.chapterState");
  const action = useAccountAction();
  const [pickedId, setPickedId] = useState<string | null>(null);

  const candidates = replacementCandidates(chapter, chapters, course);
  const picked = candidates.find((candidate) => candidate.chapter.id === pickedId);

  const { done, pending } = action;
  useEffect(() => {
    if (done !== null && !pending) onClose();
  }, [done, pending, onClose]);

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={t("title")}
      description={t("description")}
      confirmLabel={t("confirm")}
      pendingLabel={t("pending")}
      pending={action.pending}
      errorKey={action.errorKey}
      confirmDisabled={!picked || picked.blockers.length > 0}
      onConfirm={() => {
        if (picked) void action.run(() => replaceChapter(chapter.id, picked.chapter.id), t("done"));
      }}
      errorAction={
        action.errorKey === "PUBLISH_PRECONDITION" ? (
          <p className="text-sm text-muted-foreground">{t("preconditionHelp")}</p>
        ) : action.errorKey === "REPLACEMENT_INVALID" ? (
          <p className="text-sm text-muted-foreground">{t("invalidHelp")}</p>
        ) : null
      }
    >
      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <fieldset className="flex min-w-0 flex-col gap-2" disabled={action.pending}>
          <legend className="mb-1 text-sm font-medium">{t("pickLabel")}</legend>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pe-1">
            {candidates.map(({ chapter: draft, blockers }) => {
              const id = `replace-${draft.id}`;
              const disabled = blockers.length > 0;
              return (
                <label
                  key={draft.id}
                  htmlFor={id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-checked:border-primary has-checked:bg-muted",
                    disabled && "cursor-not-allowed opacity-70",
                  )}
                >
                  <input
                    id={id}
                    type="radio"
                    name="replacement"
                    className="mt-1 size-4 shrink-0 accent-primary"
                    checked={pickedId === draft.id}
                    disabled={disabled}
                    onChange={() => setPickedId(draft.id)}
                  />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium break-words">
                      <bdi>{draft.title.en}</bdi>
                    </span>
                    <span lang="ar" className="break-words text-muted-foreground">
                      <bdi>{draft.title.ar}</bdi>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("draftMeta", { number: draft.number })}
                    </span>
                    {blockers.map((blocker) => (
                      <span key={blocker} className="text-xs text-destructive">
                        {t(`blockers.${blocker}`)}
                      </span>
                    ))}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}
      {picked ? (
        <p className="text-sm" role="status">
          {t.rich("summary", {
            draft: picked.chapter.title.en,
            old: chapter.title.en,
            number: chapter.number,
            state: states(chapter.state),
            name: (chunks) => <bdi className="font-medium">{chunks}</bdi>,
          })}
        </p>
      ) : null}
    </ConfirmDialog>
  );
}
