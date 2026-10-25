"use client";

import { useTranslations } from "next-intl";
import { chartSeries, formatCount, splitDuration } from "@/lib/insights/format";
import type { Insights } from "@/lib/insights/types";
import { SeriesChart } from "./series-chart";

// The four time series: Signups, Active Students, Held Sessions and study time per bucket.
export function InsightsCharts({ series, bucket }: Pick<Insights, "series" | "bucket">) {
  const t = useTranslations("Insights");
  const data = chartSeries(series);
  const heading = (point: { label: string }) =>
    bucket === "week" ? t("charts.weekOf", { date: point.label }) : point.label;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SeriesChart
        title={t("charts.signups")}
        seriesLabel={t("charts.signups")}
        kind="bar"
        dataKey="signups"
        color="var(--chart-2)"
        data={data}
        heading={heading}
        formatValue={(point) => formatCount(point.signups)}
      />
      <SeriesChart
        title={t("charts.activeStudents")}
        seriesLabel={t("charts.activeStudents")}
        kind="line"
        dataKey="activeStudents"
        color="var(--chart-3)"
        data={data}
        heading={heading}
        formatValue={(point) => formatCount(point.activeStudents)}
      />
      <SeriesChart
        title={t("charts.heldSessions")}
        seriesLabel={t("charts.heldSessions")}
        kind="bar"
        dataKey="heldSessions"
        color="var(--chart-2)"
        data={data}
        heading={heading}
        formatValue={(point) => formatCount(point.heldSessions)}
      />
      <SeriesChart
        title={t("charts.studyTime")}
        seriesLabel={t("charts.studyTime")}
        kind="area"
        dataKey="studyHours"
        color="var(--chart-3)"
        data={data}
        heading={heading}
        formatValue={(point) => t("duration", splitDuration(point.studySeconds))}
        formatTick={(value) => t("hoursTick", { value })}
        decimals
      />
    </div>
  );
}
