import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

// The fallback while Insights load: the range control, the KPI row, the charts and a table.
export function InsightsSkeleton() {
  const t = useTranslations("Insights");
  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-6">
      <Skeleton className="h-9 w-64 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-72" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
