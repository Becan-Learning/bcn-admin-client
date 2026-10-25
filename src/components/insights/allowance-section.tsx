"use client";

import { useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bandKey, bandLabel, formatCount, planChartRows } from "@/lib/insights/format";
import { ALLOWANCE_BANDS, type PlanRow } from "@/lib/insights/types";
import { LocalizedName } from "./localized-name";

// A light-to-dark ramp of the theme's `--chart-3`, then the destructive color for Students at their
// limit. Mixed with transparency, so it reads on a light and a dark card alike.
const BAND_COLORS = [
  "color-mix(in oklab, var(--chart-3) 15%, transparent)",
  "color-mix(in oklab, var(--chart-3) 30%, transparent)",
  "color-mix(in oklab, var(--chart-3) 45%, transparent)",
  "color-mix(in oklab, var(--chart-3) 65%, transparent)",
  "color-mix(in oklab, var(--chart-3) 85%, transparent)",
  "var(--destructive)",
] as const;

const CONFIG: ChartConfig = Object.fromEntries(
  ALLOWANCE_BANDS.map((band, index) => [bandKey(index), { label: bandLabel(band), color: BAND_COLORS[index] }]),
);

// The current Period of each Student, per Plan. It ignores the selected range, and says so.
export function AllowanceSection({ plans }: { plans: PlanRow[] }) {
  const t = useTranslations("Insights.allowance");
  const rows = planChartRows(plans);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("note")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 px-2 sm:px-(--card-spacing)">
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("plan")}</TableHead>
                  <TableHead className="text-end">{t("students")}</TableHead>
                  <TableHead className="text-end">{t("atLimit")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="whitespace-normal">
                      <LocalizedName name={plan.name} />
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{formatCount(plan.students)}</TableCell>
                    <TableCell className="text-end tabular-nums">{formatCount(plan.atLimit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t("bandsTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("bandsDescription")}</p>
              <ChartContainer
                config={CONFIG}
                className="aspect-auto w-full"
                style={{ height: 96 + rows.length * 44 }}
              >
                <BarChart data={rows} layout="vertical" stackOffset="expand" accessibilityLayer>
                  <CartesianGrid horizontal={false} />
                  <YAxis dataKey="plan" type="category" width={72} tickLine={false} axisLine={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {ALLOWANCE_BANDS.map((band, index) => (
                    <Bar key={band} dataKey={bandKey(index)} stackId="bands" fill={`var(--color-${bandKey(index)})`} />
                  ))}
                </BarChart>
              </ChartContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
