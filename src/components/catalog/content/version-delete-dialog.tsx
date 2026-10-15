"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/accounts/detail/confirm-dialog";
import { useAccountAction } from "@/components/accounts/detail/use-account-action";
import { deleteVersion } from "@/lib/content/api";
import type { ContentOwnerKind, ContentVersion } from "@/lib/content/types";

// Confirms deleting a version (never live, no Session used it). The backend removes its files from storage
// first; if that fails, 502 CONTENT_STORAGE_FAILED is shown and the version stays. If the page was stale,
// 409 VERSION_IN_USE is shown here. Mount it only while it is open.
export function VersionDeleteDialog({
  kind,
  ownerId,
  version,
  onClose,
}: {
  kind: ContentOwnerKind;
  ownerId: string;
  version: ContentVersion;
  onClose: () => void;
}) {
  const t = useTranslations("ContentVersions.delete");
  const action = useAccountAction();

  const { done, pending } = action;
  useEffect(() => {
    if (done !== null && !pending) onClose();
  }, [done, pending, onClose]);

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => (open ? undefined : onClose())}
      title={t("title", { version: version.version })}
      description={t("description")}
      confirmLabel={t("confirm")}
      pendingLabel={t("pending")}
      pending={action.pending}
      errorKey={action.errorKey}
      destructive
      onConfirm={() => void action.run(() => deleteVersion(kind, ownerId, version.id), t("done"))}
    >
      {version.manifest ? (
        <p className="text-sm text-muted-foreground tabular-nums">{t("filesLine", { count: version.manifest.length })}</p>
      ) : null}
    </ConfirmDialog>
  );
}
