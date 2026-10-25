// The Insights range, kept in the URL (`?range=`) so a reload or the back button restores it. Pure
// functions only. The backend takes the same values (`GET /api/v1/admin/insights?range=`).

export const RANGES = ["7d", "30d", "90d"] as const;
export type InsightsRange = (typeof RANGES)[number];

export const DEFAULT_RANGE: InsightsRange = "30d";

// What a Next.js page gets as `searchParams`.
export type RawSearchParams = Record<string, string | string[] | undefined>;

// Never throws: a missing or bad value falls back to the default, so a hand-edited URL still renders.
export function parseRange(params: RawSearchParams): InsightsRange {
  const raw = Array.isArray(params.range) ? params.range[0] : params.range;
  return RANGES.find((range) => range === raw) ?? DEFAULT_RANGE;
}

// The default is left out, so the plain home page has a clean URL.
export function insightsHref(range: InsightsRange): string {
  return range === DEFAULT_RANGE ? "/" : `/?range=${range}`;
}
