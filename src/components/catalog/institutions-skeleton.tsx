import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

// The fallback while the Institutions load: the add button and three cards.
export function InstitutionsSkeleton() {
  const t = useTranslations("Catalog.institutions");
  return (
    <div role="status" aria-label={t("loading")} className="flex flex-col gap-4">
      <Skeleton className="h-9 w-40" />
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-56 w-full rounded-xl" />
      ))}
    </div>
  );
}
