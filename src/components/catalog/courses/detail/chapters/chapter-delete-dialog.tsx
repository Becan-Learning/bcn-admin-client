"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/accounts/detail/confirm-dialog";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { deleteChapter } from "@/lib/catalog/api";
import type { AdminChapter } from "@/lib/catalog/types";

// Confirms a hard delete. Only offered when the backend says `deletable`; if that answer is stale, 409
// CHAPTER_IN_USE is shown here. Mount it only while it is open.
export function ChapterDeleteDialog({ chapter, onClose }: { chapter: AdminChapter; onClose: () => void }) {
  const t = useTranslations("CourseDetail.chapters.delete");
  const action = useAccountAction();

  const { done, pending } = action;
  useEffect(() => {
    if (done !== null && !pending) onClose();
  }, [done, pending, onClose]);

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={t("title")}
      description={t("description", { title: `⁨${chapter.title.en}⁩` })}
      confirmLabel={t("confirm")}
      pendingLabel={t("pending")}
      pending={action.pending}
      errorKey={action.errorKey}
      destructive
      onConfirm={() => void action.run(() => deleteChapter(chapter.id), t("done"))}
    />
  );
}
