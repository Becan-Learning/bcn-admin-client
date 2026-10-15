import { useTranslations } from "next-intl";
import { CheckCircle2Icon, CircleDotIcon, EyeIcon, EyeOffIcon, XCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { needsPreview } from "@/lib/content/rules";
import type { ContentVersion } from "@/lib/content/types";

// Live is the filled badge, valid and invalid are validation, and the preview status is a separate fact.
// "Not previewed yet" on a version that could go live is amber and filled-looking so it is not missed.
export function VersionBadges({ version }: { version: ContentVersion }) {
  const t = useTranslations("ContentVersions.row");
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {version.live ? (
        <Badge>
          <CircleDotIcon aria-hidden />
          {t("live")}
        </Badge>
      ) : null}
      {version.valid ? (
        <Badge variant="outline">
          <CheckCircle2Icon aria-hidden />
          {t("valid")}
        </Badge>
      ) : (
        <Badge variant="destructive">
          <XCircleIcon aria-hidden />
          {t("invalid")}
        </Badge>
      )}
      {version.valid ? <PreviewBadge version={version} /> : null}
    </div>
  );
}

export function PreviewBadge({ version }: { version: ContentVersion }) {
  const t = useTranslations("ContentVersions.row");
  if (version.preview.previewed) {
    return (
      <Badge variant="secondary">
        <EyeIcon aria-hidden />
        {t("previewed")}
      </Badge>
    );
  }
  // A version that was live without a preview (the existing content, or one set live without looking) is
  // still "Not previewed yet", but only the ones that could go live next are called out in amber.
  const callOut = needsPreview(version);
  return (
    <Badge
      variant="outline"
      className={
        callOut
          ? "border-amber-500/60 bg-amber-500/15 text-amber-900 dark:border-amber-400/50 dark:bg-amber-400/15 dark:text-amber-200"
          : "text-muted-foreground"
      }
    >
      <EyeOffIcon aria-hidden />
      {t("notPreviewed")}
    </Badge>
  );
}
