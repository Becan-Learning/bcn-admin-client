"use client";

import { useTranslations } from "next-intl";
import { ChevronDownIcon, ExternalLinkIcon, EyeIcon, Trash2Icon, UndoIcon, UploadCloudIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDateTimeUtc } from "@/lib/accounts/format";
import { deleteBlockers, needsPreview, type LiveAction } from "@/lib/content/rules";
import type { ContentOwnerKind, ContentVersion } from "@/lib/content/types";
import { cn } from "@/lib/utils";
import { VersionBadges } from "./version-badges";
import { VersionFiles } from "./version-files";
import { VersionReport } from "./version-report";

export type RowActions = {
  onSetLive: () => void;
  onDelete: () => void;
};

// One version: a summary line (number, live and validation badges, preview status, who and when) that opens
// into the details: the validation report, the files, the facts and the actions. Every action is confirmed in
// a dialog the card owns.
export function VersionRow({
  kind,
  version,
  liveAction,
  previewUrl,
  previewConfigured,
  open,
  onOpenChange,
  actions,
}: {
  kind: ContentOwnerKind;
  version: ContentVersion;
  liveAction: LiveAction | null;
  // The student app link for this version (Chapter versions only), or null.
  previewUrl: string | null;
  // Whether the admin app knows the student app at all (STUDENT_APP_URL is valid); Chapter versions only.
  previewConfigured: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: RowActions;
}) {
  const t = useTranslations("ContentVersions.row");
  const uploaded = formatDateTimeUtc(version.createdAt);

  return (
    <li className={cn("rounded-lg border bg-card", !version.valid && "border-destructive/40")}>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <CollapsibleTrigger
          className="group flex w-full items-start gap-3 rounded-lg p-3 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:p-4"
          aria-label={t("toggle", { version: version.version })}
        >
          <ChevronDownIcon
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-medium tabular-nums">{t("version", { version: version.version })}</span>
              <VersionBadges version={version} />
            </span>
            <span className="text-xs text-muted-foreground">
              {version.createdBy
                ? t.rich("uploadedBy", {
                    name: version.createdBy.name,
                    date: uploaded,
                    bdi: (chunks) => <bdi>{chunks}</bdi>,
                  })
                : t("uploadedAt", { date: uploaded })}
              <span className="tabular-nums">
                {version.lessonCount !== null ? ` · ${t("lessons", { count: version.lessonCount })}` : ""}
                {` · ${t("sessions", { count: version.sessions })}`}
              </span>
            </span>
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <VersionDetail
            kind={kind}
            version={version}
            liveAction={liveAction}
            previewUrl={previewUrl}
            previewConfigured={previewConfigured}
            actions={actions}
          />
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function VersionDetail({
  kind,
  version,
  liveAction,
  previewUrl,
  previewConfigured,
  actions,
}: {
  kind: ContentOwnerKind;
  version: ContentVersion;
  liveAction: LiveAction | null;
  previewUrl: string | null;
  previewConfigured: boolean;
  actions: RowActions;
}) {
  const t = useTranslations("ContentVersions.detail");
  const a = useTranslations("ContentVersions.actions");
  const p = useTranslations("ContentVersions.preview");
  const blockers = deleteBlockers(version);
  const adminSessions = version.preview.adminSessions;

  return (
    <div className="flex flex-col gap-5 border-t p-3 sm:p-4">
      {needsPreview(version) ? (
        <Alert className="border-amber-500/60 bg-amber-500/10 text-foreground dark:border-amber-400/50 dark:bg-amber-400/10">
          <EyeIcon className="text-amber-700 dark:text-amber-300" />
          <AlertTitle>{t("notPreviewedTitle")}</AlertTitle>
          <AlertDescription>{kind === "chapter" ? t("notPreviewedBody") : t("notPreviewedBodyCourse")}</AlertDescription>
        </Alert>
      ) : version.valid && version.preview.previewed ? (
        <p className="text-sm text-muted-foreground">{t("previewedBody", { count: adminSessions })}</p>
      ) : null}

      <section aria-labelledby={`report-${version.id}`} className="flex flex-col gap-2">
        <h4 id={`report-${version.id}`} className="text-sm font-medium">
          {t("reportTitle")}
        </h4>
        {version.report === null ? (
          <p className="text-sm text-muted-foreground">{t("reportNone")}</p>
        ) : version.report.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("reportPassed")}</p>
        ) : (
          <VersionReport report={version.report} />
        )}
      </section>

      <section aria-labelledby={`files-${version.id}`} className="flex flex-col gap-2">
        <h4 id={`files-${version.id}`} className="text-sm font-medium">
          {t("filesTitle")}
        </h4>
        <VersionFiles manifest={version.manifest} />
      </section>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">{t("factsPrefix")}</dt>
        <dd>
          <code dir="ltr" className="font-mono text-xs break-all">
            {version.prefix}
          </code>
        </dd>
        <dt className="text-muted-foreground">{t("factsFirstLive")}</dt>
        <dd>{version.firstLiveAt ? formatDateTimeUtc(version.firstLiveAt) : t("factsNeverLive")}</dd>
        <dt className="text-muted-foreground">{t("factsSessions")}</dt>
        <dd className="tabular-nums">
          {t("factsSessionsValue", { count: version.sessions, admin: adminSessions })}
        </dd>
      </dl>

      <section aria-label={t("actionsTitle")} className="flex flex-col gap-3 border-t pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {kind === "chapter" && version.valid && previewUrl ? (
            <Button asChild variant={needsPreview(version) ? "default" : "outline"}>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon aria-hidden />
                {p("link")}
              </a>
            </Button>
          ) : null}
          {liveAction ? (
            <Button type="button" variant={needsPreview(version) ? "outline" : "default"} onClick={actions.onSetLive}>
              {liveAction === "rollback" ? <UndoIcon aria-hidden /> : <UploadCloudIcon aria-hidden />}
              {liveAction === "rollback" ? a("rollback") : a("setLive")}
            </Button>
          ) : null}
          {version.deletable ? (
            <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={actions.onDelete}>
              <Trash2Icon aria-hidden />
              {a("delete")}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {kind === "chapter" && version.valid && previewUrl ? <p>{p("help")}</p> : null}
          {kind === "chapter" && version.valid && !previewConfigured ? <p>{p("unavailable")}</p> : null}
          {kind === "chapter" && !version.valid ? <p>{p("invalidOnly")}</p> : null}
          {version.live ? <p>{a("isLive")}</p> : null}
          {!version.valid ? <p>{a("cannotGoLive")}</p> : null}
          {!version.deletable ? (
            <p>
              {a("deleteBlocked", {
                reasons: blockers
                  .map((blocker) =>
                    blocker === "sessions"
                      ? a("deleteBlockers.sessions", { count: version.sessions })
                      : a(`deleteBlockers.${blocker}`),
                  )
                  .join(" "),
              })}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
