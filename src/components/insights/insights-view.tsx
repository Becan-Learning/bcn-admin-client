"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircleIcon, UsersIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { InsightsResult } from "@/lib/insights/fetch";
import { insightsHref, type InsightsRange } from "@/lib/insights/range";
import type { Insights } from "@/lib/insights/types";
import { AllowanceSection } from "./allowance-section";
import { CoursesTable } from "./courses-table";
import { InsightsCharts } from "./insights-charts";
import { InsightsKpis } from "./insights-kpis";
import { InstitutionsTable } from "./institutions-table";
import { RangeControl } from "./range-control";

// The range is the only state and it lives in the URL. Picking one navigates to the same page with a
// new `?range=`; the server component above re-fetches. Wrapped in a transition, the old numbers stay
// on screen (dimmed) until the new ones arrive, instead of flashing back to the skeleton.
export function InsightsView({ range, result }: { range: InsightsRange; result: InsightsResult }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const empty = result.ok && result.data.totals.students === 0;

  return (
    <div className="flex flex-col gap-6">
      {empty ? null : (
        <RangeControl
          value={range}
          onChange={(next) => startTransition(() => router.push(insightsHref(next), { scroll: false }))}
        />
      )}
      <div aria-busy={pending} className={pending ? "opacity-60 transition-opacity" : undefined}>
        {!result.ok ? (
          <ErrorPanel errorKey={result.errorKey} onRetry={() => startTransition(() => router.refresh())} />
        ) : empty ? (
          <EmptyPanel />
        ) : (
          <InsightsBody range={range} data={result.data} />
        )}
      </div>
    </div>
  );
}

function InsightsBody({ range, data }: { range: InsightsRange; data: Insights }) {
  const t = useTranslations("Insights");
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: data.timeZone,
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(new Date(data.generatedAt));

  return (
    <div className="flex flex-col gap-6">
      <InsightsKpis totals={data.totals} range={range} />
      <InsightsCharts series={data.series} bucket={data.bucket} />
      <p className="text-xs text-muted-foreground">
        {t(`footnote.${data.bucket}`)} {t("footnote.timeZone", { timeZone: data.timeZone, time })}
      </p>
      <CoursesTable courses={data.courses} />
      <InstitutionsTable institutions={data.institutions} />
      <AllowanceSection plans={data.allowance.plans} />
    </div>
  );
}

function ErrorPanel({
  errorKey,
  onRetry,
}: {
  errorKey: Extract<InsightsResult, { ok: false }>["errorKey"];
  onRetry: () => void;
}) {
  const t = useTranslations("Insights");
  const errors = useTranslations("Errors");
  const common = useTranslations("Common");
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon />
      <AlertTitle>{t("errorTitle")}</AlertTitle>
      <AlertDescription>
        <p>{errors(errorKey)}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {common("tryAgain")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function EmptyPanel() {
  const t = useTranslations("Insights");
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
      <UsersIcon aria-hidden className="size-8 text-muted-foreground" />
      <p className="font-medium">{t("emptyTitle")}</p>
      <p className="text-sm text-muted-foreground">{t("emptyDescription")}</p>
    </div>
  );
}
