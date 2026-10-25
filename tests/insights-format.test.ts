import { describe, expect, it } from "vitest";
import {
  bandKey,
  bandLabel,
  chartSeries,
  formatBucketDate,
  formatCount,
  planChartRows,
  splitDuration,
} from "@/lib/insights/format";
import { insightsSchema } from "@/lib/insights/types";
import { insightsFixture } from "./fixtures/insights";

describe("splitDuration", () => {
  it("splits seconds into hours and minutes", () => {
    expect(splitDuration(0)).toEqual({ hours: 0, minutes: 0 });
    expect(splitDuration(3600)).toEqual({ hours: 1, minutes: 0 });
    expect(splitDuration(712345)).toEqual({ hours: 197, minutes: 52 });
  });

  it("rounds to the nearest minute, carrying into the hour", () => {
    expect(splitDuration(29)).toEqual({ hours: 0, minutes: 0 });
    expect(splitDuration(30)).toEqual({ hours: 0, minutes: 1 });
    expect(splitDuration(3570)).toEqual({ hours: 1, minutes: 0 });
  });

  it("treats bad input as zero", () => {
    expect(splitDuration(-5)).toEqual({ hours: 0, minutes: 0 });
    expect(splitDuration(Number.NaN)).toEqual({ hours: 0, minutes: 0 });
  });
});

describe("formatBucketDate", () => {
  it("shows the local calendar day without shifting it", () => {
    expect(formatBucketDate("2026-09-27")).toBe("Sep 27");
    expect(formatBucketDate("2026-01-01")).toBe("Jan 1");
    expect(formatBucketDate("2026-12-31")).toBe("Dec 31");
  });
});

describe("formatCount", () => {
  it("uses ASCII digits with comma grouping", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(1234567)).toBe("1,234,567");
  });
});

describe("chartSeries", () => {
  it("adds the label and the study hours of each bucket", () => {
    const [first, second] = chartSeries(insightsSchema.parse(insightsFixture()).series);
    expect(first).toMatchObject({ date: "2026-07-26", label: "Jul 26", studyHours: 6.78 });
    expect(second).toMatchObject({ label: "Aug 2", studyHours: 0, heldSessions: 0 });
  });
});

describe("planChartRows", () => {
  it("makes one row per Plan with a count for each band", () => {
    const [row] = planChartRows(insightsSchema.parse(insightsFixture()).allowance.plans);
    expect(row).toMatchObject({ id: "free", plan: "Free" });
    expect([0, 1, 2, 3, 4, 5].map((index) => row[bandKey(index)])).toEqual([210, 80, 40, 20, 13, 37]);
  });

  it("looks bands up by name and fills the ones that are missing with zero", () => {
    const plan = insightsSchema.parse(insightsFixture()).allowance.plans[0];
    const [row] = planChartRows([
      { ...plan, usage: [{ band: "100", students: 2 }, { band: "0", students: 5 }] },
    ]);
    expect([0, 1, 2, 3, 4, 5].map((index) => row[bandKey(index)])).toEqual([5, 0, 0, 0, 0, 2]);
  });
});

describe("bandLabel", () => {
  it("adds a percent sign", () => {
    expect(bandLabel("0")).toBe("0%");
    expect(bandLabel("1-25")).toBe("1-25%");
    expect(bandLabel("100")).toBe("100%");
  });
});
