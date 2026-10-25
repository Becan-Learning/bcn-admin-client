import { ALLOWANCE_BANDS, type AllowanceBand, type BucketPoint, type PlanRow } from "./types";

// Whole numbers always print with ASCII digits and comma grouping, whatever the browser's locale.
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
export function formatCount(value: number): string {
  return integer.format(value);
}

// Study time as whole hours and minutes, rounded to the nearest minute.
export function splitDuration(seconds: number): { hours: number; minutes: number } {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds / 60)) : 0;
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

// A bucket's `date` is a local calendar day (YYYY-MM-DD, Asia/Riyadh), not an instant. It is shown
// as that same day: parsed and formatted in UTC so the reader's own time zone never shifts it.
const dayFormat = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
export function formatBucketDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return dayFormat.format(new Date(Date.UTC(year, month - 1, day)));
}

export type ChartPoint = BucketPoint & {
  // "Sep 27": the X-axis tick and the tooltip heading (the page adds "Week of" for week buckets).
  label: string;
  // The study time chart's Y value.
  studyHours: number;
};

export function chartSeries(series: readonly BucketPoint[]): ChartPoint[] {
  return series.map((point) => ({
    ...point,
    label: formatBucketDate(point.date),
    studyHours: Math.round((point.studySeconds / 3600) * 100) / 100,
  }));
}

export function bandLabel(band: AllowanceBand): string {
  return `${band}%`;
}

// Chart keys for the six bands: `band0` to `band5`, in the order of ALLOWANCE_BANDS.
export const bandKey = (index: number) => `band${index}`;

export type PlanChartRow = { id: string; plan: string } & Record<string, number | string>;

// One row per Plan with a count per band. The bands are looked up by name, so an order the backend
// changes cannot mislabel them, and a missing band counts as zero.
export function planChartRows(plans: readonly PlanRow[]): PlanChartRow[] {
  return plans.map((plan) => {
    const row: PlanChartRow = { id: plan.id, plan: plan.name.en };
    ALLOWANCE_BANDS.forEach((band, index) => {
      row[bandKey(index)] = plan.usage.find((entry) => entry.band === band)?.students ?? 0;
    });
    return row;
  });
}
