import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

// The fallback while the Accounts load: the filter bar's shape and ten rows.
export function AccountsSkeleton() {
  const t = useTranslations("Accounts");
  return (
    <div role="status" aria-label={t("loadingList")} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-full sm:w-72" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-44" />
      </div>
      <div className="flex flex-col gap-px overflow-hidden rounded-md border">
        <Skeleton className="h-10 rounded-none" />
        {Array.from({ length: 10 }, (_, index) => (
          <Skeleton key={index} className="h-14 rounded-none" />
        ))}
      </div>
    </div>
  );
}
