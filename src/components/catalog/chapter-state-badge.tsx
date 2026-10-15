import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { ChapterState } from "@/lib/catalog/types";

// Published is the filled badge (Students can start it), Coming soon the soft one (listed, not startable),
// Draft an outline, and Archived an outline in muted text.
const VARIANT = {
  draft: "outline",
  coming_soon: "secondary",
  published: "default",
  archived: "outline",
} as const;

export function ChapterStateBadge({ state }: { state: ChapterState }) {
  const t = useTranslations("Catalog.chapterState");
  return (
    <Badge variant={VARIANT[state]} className={state === "archived" ? "text-muted-foreground" : undefined}>
      {t(state)}
    </Badge>
  );
}
