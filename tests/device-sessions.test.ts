import { describe, expect, it } from "vitest";
import { sortDeviceSessions } from "@/lib/account/device-sessions";

const session = (id: string, createdAt: string) => ({ id, token: `t-${id}`, createdAt });

describe("sortDeviceSessions", () => {
  it("puts this device first, then newest first", () => {
    const sorted = sortDeviceSessions(
      [session("old", "2026-01-01"), session("me", "2026-02-01"), session("new", "2026-03-01")],
      "me",
    );
    expect(sorted.map((s) => s.id)).toEqual(["me", "new", "old"]);
  });

  it("does not change the list it is given", () => {
    const input = [session("a", "2026-01-01"), session("b", "2026-02-01")];
    sortDeviceSessions(input, "a");
    expect(input.map((s) => s.id)).toEqual(["a", "b"]);
  });
});
