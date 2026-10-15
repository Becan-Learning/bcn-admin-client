import { describe, expect, it } from "vitest";
import { allowanceSchema } from "@/lib/accounts/detail-types";
import { formatDuration, meter, minutesLimit, minutesUsed, usageMeters } from "@/lib/accounts/usage";

describe("formatDuration", () => {
  it("shows mm:ss under an hour", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(59)).toBe("00:59");
    expect(formatDuration(61)).toBe("01:01");
    expect(formatDuration(3599)).toBe("59:59");
  });

  it("shows h:mm:ss from one hour", () => {
    expect(formatDuration(3600)).toBe("1:00:00");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(36000)).toBe("10:00:00");
  });

  it("drops fractions and treats bad input as zero", () => {
    expect(formatDuration(59.9)).toBe("00:59");
    expect(formatDuration(-5)).toBe("00:00");
    expect(formatDuration(Number.NaN)).toBe("00:00");
  });
});

describe("minutes", () => {
  it("rounds used minutes up and the limit down, like the student app", () => {
    expect(minutesUsed(0)).toBe(0);
    expect(minutesUsed(1)).toBe(1);
    expect(minutesUsed(60)).toBe(1);
    expect(minutesUsed(61)).toBe(2);
    expect(minutesLimit(3659)).toBe(60);
    expect(minutesLimit(null)).toBeNull();
  });
});

describe("meter", () => {
  it("treats a null limit as unlimited", () => {
    expect(meter(7, null)).toEqual({ kind: "unlimited", used: 7 });
  });

  it("computes a whole percentage", () => {
    expect(meter(1, 3)).toEqual({ kind: "limited", used: 1, limit: 3, percent: 33 });
    expect(meter(0, 10)).toMatchObject({ percent: 0 });
  });

  it("caps at 100 when over the limit", () => {
    expect(meter(12, 10)).toMatchObject({ percent: 100 });
  });

  it("is full when the limit is zero", () => {
    expect(meter(0, 0)).toMatchObject({ percent: 100 });
  });
});

describe("usageMeters", () => {
  const base = {
    unlimited: false,
    plan: { id: "p", name: { ar: "أ", en: "Free" } },
    period: { start: "2026-10-01T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" },
    limits: { sessions: 10, seconds: 3600, enrollments: 2, sessionSeconds: 1800, minStartSeconds: 300 },
    usage: { sessions: 4, seconds: 1201, enrollments: 1 },
  };

  it("converts seconds to rounded minutes", () => {
    const meters = usageMeters(allowanceSchema.parse(base));
    expect(meters.sessions).toMatchObject({ used: 4, limit: 10, percent: 40 });
    expect(meters.minutes).toMatchObject({ used: 21, limit: 60, percent: 35 });
    expect(meters.slots).toMatchObject({ used: 1, limit: 2, percent: 50 });
  });

  it("handles null limits as unlimited", () => {
    const meters = usageMeters(
      allowanceSchema.parse({
        ...base,
        limits: { sessions: null, seconds: null, enrollments: null, sessionSeconds: null, minStartSeconds: null },
      }),
    );
    expect(meters.sessions.kind).toBe("unlimited");
    expect(meters.minutes).toEqual({ kind: "unlimited", used: 21 });
    expect(meters.slots.kind).toBe("unlimited");
  });

  it("defaults `unlimited` to false when the backend omits it", () => {
    const withoutFlag: Record<string, unknown> = { ...base };
    delete withoutFlag.unlimited;
    expect(allowanceSchema.parse(withoutFlag).unlimited).toBe(false);
  });
});
