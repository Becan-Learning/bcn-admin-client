import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { InsightsSkeleton } from "@/components/insights/insights-skeleton";
import { InsightsView } from "@/components/insights/insights-view";
import { PageHeader } from "@/components/shell/page-header";
import { fetchInsights } from "@/lib/insights/fetch";
import { parseRange, type RawSearchParams } from "@/lib/insights/range";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Pages.insights");
  return { title: t("title") };
}

export default async function Page({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const t = await getTranslations("Pages.insights");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title")} description={t("description")} />
      <Suspense fallback={<InsightsSkeleton />}>
        <Insights searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Fetched on the server inside Suspense with the visitor's cookie forwarded, like the Accounts list:
// the range is the URL, so picking one is a navigation that re-runs this component.
async function Insights({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const range = parseRange(await searchParams);
  const result = await fetchInsights(range, await headers());
  return <InsightsView range={range} result={result} />;
}
