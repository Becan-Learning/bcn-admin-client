import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

// The fallback while the Courses load: the button, the filter bar's shape and eight rows.
export function CoursesSkeleton() {
  const t = useTranslations("Catalog.courses");
  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-4">
      <Skeleton className="h-9 w-32" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-full sm:w-72" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="flex flex-col gap-px overflow-hidden rounded-md border">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-16 rounded-none" />
        ))}
      </div>
    </div>
  );
}
