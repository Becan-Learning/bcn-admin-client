import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuditLogView } from "@/components/audit-log/audit-log-view";
import { PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pages.auditLog");
  return { title: t("title") };
}

export default async function Page() {
  const t = await getTranslations("Pages.auditLog");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      {/* useSearchParams reads the request's URL, so the view sits in Suspense (Cache Components). */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AuditLogView />
      </Suspense>
    </div>
  );
}
