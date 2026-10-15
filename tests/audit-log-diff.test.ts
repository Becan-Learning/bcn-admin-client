import { describe, expect, it } from "vitest";
import { diffAuditValues } from "@/lib/audit-log/diff";

describe("diffAuditValues", () => {
  it("lists only the keys that changed", () => {
    expect(
      diffAuditValues({ name: "Ann", role: "user" }, { name: "Ann", role: "admin" }),
    ).toEqual([{ key: "role", before: "user", after: "admin" }]);
  });

  it("treats a ban as banned, reason and expiry changing from null", () => {
    expect(
      diffAuditValues(
        { banned: false, banReason: null, banExpires: null },
        { banned: true, banReason: "spam", banExpires: null },
      ),
    ).toEqual([
      { key: "banReason", before: null, after: "spam" },
      { key: "banned", before: false, after: true },
    ]);
  });

  it("counts a key on one side only as changed", () => {
    expect(diffAuditValues({ sessionId: "s1" }, null)).toEqual([
      { key: "sessionId", before: "s1", after: undefined },
    ]);
    expect(diffAuditValues(null, { name: "Ann" })).toEqual([
      { key: "name", before: undefined, after: "Ann" },
    ]);
  });

  it("tells a stored null from an absent key", () => {
    expect(diffAuditValues({ phoneNumber: null }, {})).toEqual([
      { key: "phoneNumber", before: null, after: undefined },
    ]);
  });

  it("compares nested values by content", () => {
    expect(diffAuditValues({ x: { a: 1 } }, { x: { a: 1 } })).toEqual([]);
    expect(diffAuditValues({ x: [1, 2] }, { x: [1, 3] })).toHaveLength(1);
  });

  it("is empty for an entry with no values, such as an Account removal", () => {
    expect(diffAuditValues(null, null)).toEqual([]);
  });

  it("orders keys the same way every time", () => {
    const a = diffAuditValues({ b: 1, a: 1 }, { b: 2, a: 2 }).map((c) => c.key);
    const b = diffAuditValues({ a: 1, b: 1 }, { a: 2, b: 2 }).map((c) => c.key);
    expect(a).toEqual(["a", "b"]);
    expect(b).toEqual(a);
  });
});
