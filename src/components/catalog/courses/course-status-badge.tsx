import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { CourseStatus } from "@/lib/catalog/types";

// Published is the filled badge (it is what Students see), Draft an outline, Archived the muted one.
const VARIANT = {
  draft: "outline",
  published: "default",
  archived: "secondary",
} as const;

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  const t = useTranslations("Catalog.courseStatus");
  return <Badge variant={VARIANT[status]}>{t(status)}</Badge>;
}
