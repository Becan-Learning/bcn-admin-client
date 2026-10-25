import { describe, expect, it } from "vitest";
import { insightsSchema } from "@/lib/insights/types";
import { insightsFixture } from "./fixtures/insights";

describe("insightsSchema", () => {
  it("accepts a response shaped like the contract", () => {
    const parsed = insightsSchema.safeParse(insightsFixture());
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.courses[0].chapters[1].published).toBe(false);
      expect(parsed.data.institutions[1]).toMatchObject({ id: null, name: null });
    }
  });

  it("drops unknown fields", () => {
    const parsed = insightsSchema.parse({ ...insightsFixture(), extra: 1 });
    expect("extra" in parsed).toBe(false);
  });

  it("accepts empty lists and zero totals", () => {
    const empty = {
      ...insightsFixture(),
      totals: { students: 0, signups: 0, activeStudents: 0, heldSessions: 0, studySeconds: 0 },
      series: [],
      institutions: [],
      courses: [],
      allowance: { plans: [] },
    };
    expect(insightsSchema.safeParse(empty).success).toBe(true);
  });

  it("refuses a response that breaks the contract", () => {
    const base = insightsFixture();
    const bad: unknown[] = [
      null,
      {},
      { ...base, range: "1d" },
      { ...base, bucket: "month" },
      { ...base, totals: { ...base.totals, students: -1 } },
      { ...base, totals: { ...base.totals, signups: "57" } },
      { ...base, series: [{ ...base.series[0], date: "26/07/2026" }] },
      { ...base, courses: [{ ...base.courses[0], chapters: [{ ...base.courses[0].chapters[0], published: "yes" }] }] },
      { ...base, institutions: [{ ...base.institutions[0], name: null, id: "" }] },
      { ...base, allowance: { plans: [{ ...base.allowance.plans[0], usage: [{ band: "101", students: 1 }] }] } },
    ];
    for (const value of bad) {
      expect(insightsSchema.safeParse(value).success).toBe(false);
    }
  });
});
