import { useTranslations } from "next-intl";
import { TriangleAlertIcon } from "lucide-react";
import { groupReport } from "@/lib/content/rules";
import type { ReportIssue } from "@/lib/content/types";

// The validator's findings grouped by file. The rule, location and message are the validator's own English
// output (backend `ValidationIssue`), shown as written, and the heading says so. File names and messages can
// hold lesson text, so they are isolated in <bdi>.
export function VersionReport({ report }: { report: ReportIssue[] }) {
  const t = useTranslations("ContentVersions.detail");
  const groups = groupReport(report);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-destructive">
        {t("reportFailed", { count: report.length, files: groups.length })}
      </p>
      <p className="text-xs text-muted-foreground">{t("reportIntro")}</p>
      <ul className="flex flex-col gap-3">
        {groups.map((group) => (
          <li key={group.file} className="rounded-md border">
            <p className="flex items-start gap-2 border-b bg-muted/50 px-3 py-2 text-sm font-medium">
              <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
              {group.file === "" ? (
                <span>{t("wholeArchive")}</span>
              ) : (
                <code dir="ltr" className="font-mono text-xs break-all">
                  <bdi>{group.file}</bdi>
                </code>
              )}
            </p>
            <ul className="divide-y">
              {group.issues.map((issue, index) => (
                <li key={`${issue.path}-${issue.rule}-${index}`} className="flex flex-col gap-1 px-3 py-2 text-sm">
                  <span className="break-words">
                    <bdi>{issue.message}</bdi>
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span dir="ltr" className="font-mono break-all">
                      {t("rule", { rule: issue.rule })}
                    </span>
                    {issue.path !== "" ? (
                      <span dir="ltr" className="font-mono break-all">
                        {t("location", { path: issue.path })}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
