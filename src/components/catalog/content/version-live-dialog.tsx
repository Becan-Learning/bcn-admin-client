"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/accounts/detail/confirm-dialog";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { setLiveVersion } from "@/lib/content/api";
import { needsPreview, type LiveAction } from "@/lib/content/rules";
import type { ContentOwnerKind, ContentVersion } from "@/lib/content/types";

// Confirms Set live, or a rollback (set live on an older version). It says what changes for new Sessions and
// that running Sessions keep their version. Mount it only while it is open.
export function VersionLiveDialog({
  kind,
  ownerId,
  version,
  current,
  action: liveAction,
  onClose,
}: {
  kind: ContentOwnerKind;
  ownerId: string;
  version: ContentVersion;
  // The version that is live now, if any.
  current: ContentVersion | null;
  action: LiveAction;
  onClose: () => void;
}) {
  const t = useTranslations("ContentVersions.live");
  const action = useAccountAction();
  const rollback = liveAction === "rollback" && current !== null;

  const { done, pending } = action;
  useEffect(() => {
    if (done !== null && !pending) onClose();
  }, [done, pending, onClose]);

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={rollback ? t("rollbackTitle", { version: version.version }) : t("setTitle", { version: version.version })}
      description={
        rollback
          ? t("rollbackDescription", { version: version.version, current: current.version })
          : t("setDescription", { version: version.version })
      }
      confirmLabel={rollback ? t("confirmRollback") : t("confirmSet")}
      pendingLabel={t("pending")}
      pending={action.pending}
      errorKey={action.errorKey}
      onConfirm={() =>
        void action.run(
          () => setLiveVersion(kind, ownerId, version.id),
          rollback ? t("doneRollback", { version: version.version }) : t("doneSet", { version: version.version }),
        )
      }
    >
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
        {current === null ? <li>{t("setFirst")}</li> : null}
        {kind === "chapter" && version.lessonCount !== null ? (
          <li>{t("lessonCount", { count: version.lessonCount })}</li>
        ) : null}
        {kind === "chapter" ? <li>{t("chapterState")}</li> : null}
        {needsPreview(version) ? <li className="text-foreground">{t("notPreviewed")}</li> : null}
      </ul>
    </ConfirmDialog>
  );
}
