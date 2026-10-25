import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE, insightsHref, parseRange } from "@/lib/insights/range";

describe("parseRange", () => {
  it("reads the three ranges", () => {
    expect(parseRange({ range: "7d" })).toBe("7d");
    expect(parseRange({ range: "30d" })).toBe("30d");
    expect(parseRange({ range: "90d" })).toBe("90d");
  });

  it("uses the first of a repeated parameter", () => {
    expect(parseRange({ range: ["7d", "90d"] })).toBe("7d");
  });

  it("falls back to 30 days for anything else", () => {
    expect(DEFAULT_RANGE).toBe("30d");
    for (const bad of [undefined, "", "1d", "30", "30D", "all", " 7d"]) {
      expect(parseRange({ range: bad }), String(bad)).toBe("30d");
    }
    expect(parseRange({})).toBe("30d");
  });
});

describe("insightsHref", () => {
  it("leaves the default out of the URL", () => {
    expect(insightsHref("30d")).toBe("/");
    expect(insightsHref("7d")).toBe("/?range=7d");
    expect(insightsHref("90d")).toBe("/?range=90d");
  });
});
