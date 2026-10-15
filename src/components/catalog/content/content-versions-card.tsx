"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2Icon, TriangleAlertIcon, XIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { liveAction, liveVersionOf, type LiveAction } from "@/lib/content/rules";
import type { ContentOwnerKind, ContentVersion } from "@/lib/content/types";
import { UploadPanel } from "./upload-panel";
import { VersionDeleteDialog } from "./version-delete-dialog";
import { VersionLiveDialog } from "./version-live-dialog";
import { VersionRow } from "./version-row";

// Only one dialog is open at a time. It holds the version as it was when the Admin opened it, so the refresh
// that follows a delete does not blank the dialog before it closes.
type DialogTarget =
  | { kind: "live"; version: ContentVersion; action: LiveAction; current: ContentVersion | null }
  | { kind: "delete"; version: ContentVersion };

// The Content versions of a Chapter or a Course: the upload panel, then the versions newest first, each opening
// into its report, files and actions. `previewUrls` (Chapter versions only) maps a version id to its student
// app link; null means the admin app has no student app address.
export function ContentVersionsCard({
  kind,
  ownerId,
  title,
  description,
  expects,
  versions,
  previewUrls,
}: {
  kind: ContentOwnerKind;
  ownerId: string;
  title: string;
  description: string;
  expects: string;
  versions: ContentVersion[];
  previewUrls: Record<string, string> | null;
}) {
  const t = useTranslations("ContentVersions");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [uploaded, setUploaded] = useState<ContentVersion | null>(null);
  const current = liveVersionOf(versions);

  function onUploaded(version: ContentVersion) {
    setUploaded(version);
    // An invalid upload opens on its report; a valid one on its details, where Set live is.
    setOpen((state) => ({ ...state, [version.id]: true }));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <UploadPanel kind={kind} ownerId={ownerId} expects={expects} onUploaded={onUploaded} />

        {uploaded ? (
          <Alert variant={uploaded.valid ? "default" : "destructive"} role="status">
            {uploaded.valid ? <CheckCircle2Icon /> : <TriangleAlertIcon />}
            <AlertTitle>{t("upload.doneTitle")}</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              {uploaded.valid
                ? t("upload.doneValid", { version: uploaded.version })
                : t("upload.doneInvalid", { version: uploaded.version, count: uploaded.report?.length ?? 0 })}
              <Button type="button" variant="outline" size="sm" onClick={() => setUploaded(null)}>
                <XIcon aria-hidden />
                {t("upload.dismiss")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        <section aria-labelledby={`versions-${ownerId}`} className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 id={`versions-${ownerId}`} className="text-sm font-medium">
              {t("list.title")}
            </h3>
            {versions.length > 0 ? (
              <p className="text-xs text-muted-foreground tabular-nums">{t("list.count", { count: versions.length })}</p>
            ) : null}
          </div>
          {versions.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">{t("list.empty")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {versions.map((version) => {
                const action = liveAction(version, versions);
                return (
                  <VersionRow
                    key={version.id}
                    kind={kind}
                    version={version}
                    liveAction={action}
                    previewUrl={previewUrls?.[version.id] ?? null}
                    previewConfigured={previewUrls !== null}
                    open={open[version.id] ?? false}
                    onOpenChange={(next) => setOpen((state) => ({ ...state, [version.id]: next }))}
                    actions={{
                      onSetLive: () => action && setDialog({ kind: "live", version, action, current }),
                      onDelete: () => setDialog({ kind: "delete", version }),
                    }}
                  />
                );
              })}
            </ul>
          )}
        </section>
      </CardContent>

      {dialog?.kind === "live" ? (
        <VersionLiveDialog
          kind={kind}
          ownerId={ownerId}
          version={dialog.version}
          current={dialog.current}
          action={dialog.action}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.kind === "delete" ? (
        <VersionDeleteDialog kind={kind} ownerId={ownerId} version={dialog.version} onClose={() => setDialog(null)} />
      ) : null}
    </Card>
  );
}
