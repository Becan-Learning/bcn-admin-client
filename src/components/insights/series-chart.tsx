"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartPoint } from "@/lib/insights/format";

type SeriesChartProps = {
  title: string;
  kind: "bar" | "line" | "area";
  // The key of the value in each point.
  dataKey: "signups" | "activeStudents" | "heldSessions" | "studyHours";
  // Name of the series, for the tooltip.
  seriesLabel: string;
  // A `--chart-*` token, such as "var(--chart-2)".
  color: string;
  data: ChartPoint[];
  // Heading of a tooltip: the bucket's date, with "Week of" for week buckets.
  heading: (point: ChartPoint) => string;
  // The exact value in the tooltip. Defaults to the plain number.
  formatValue: (point: ChartPoint) => string;
  formatTick?: (value: number) => string;
  decimals?: boolean;
};

// One metric over time. Bars for counts of things that happen in a bucket, a line or an area for the
// rest. The colors are the theme's `--chart-*` tokens, so light and dark both work.
export function SeriesChart({
  title,
  kind,
  dataKey,
  seriesLabel,
  color,
  data,
  heading,
  formatValue,
  formatTick,
  decimals = false,
}: SeriesChartProps) {
  const config = { [dataKey]: { label: seriesLabel, color } } satisfies ChartConfig;
  const fill = `var(--color-${dataKey})`;

  const grid = <CartesianGrid vertical={false} />;
  const xAxis = <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />;
  const yAxis = (
    <YAxis
      width={40}
      tickLine={false}
      axisLine={false}
      allowDecimals={decimals}
      tickFormatter={formatTick}
    />
  );
  const tooltip = (
    <ChartTooltip
      cursor={kind === "bar" ? { fillOpacity: 0.4 } : undefined}
      content={
        <ChartTooltipContent
          labelFormatter={(_, payload) => {
            const point = payload?.[0]?.payload as ChartPoint | undefined;
            return point ? heading(point) : null;
          }}
          formatter={(_, __, item) => (
            <div className="flex w-full items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[2px]" style={{ background: fill }} />
              <span className="text-muted-foreground">{seriesLabel}</span>
              <span className="ms-auto font-mono font-medium tabular-nums">
                {formatValue(item.payload as ChartPoint)}
              </span>
            </div>
          )}
        />
      }
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="aspect-auto h-56 w-full">
          {kind === "bar" ? (
            <BarChart data={data} accessibilityLayer>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              <Bar dataKey={dataKey} fill={fill} radius={[2, 2, 0, 0]} />
            </BarChart>
          ) : kind === "line" ? (
            <LineChart data={data} accessibilityLayer>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              <Line dataKey={dataKey} type="monotone" stroke={fill} strokeWidth={2} dot={false} />
            </LineChart>
          ) : (
            <AreaChart data={data} accessibilityLayer>
              {grid}
              {xAxis}
              {yAxis}
              {tooltip}
              <Area dataKey={dataKey} type="monotone" stroke={fill} fill={fill} fillOpacity={0.25} strokeWidth={2} />
            </AreaChart>
          )}
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

