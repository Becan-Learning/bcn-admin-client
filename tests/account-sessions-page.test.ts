import { describe, expect, it } from "vitest";
import { pageCount, parseSessionsPage, sessionsPageHref } from "@/lib/accounts/sessions-page";

describe("parseSessionsPage", () => {
  it("reads a positive integer", () => {
    expect(parseSessionsPage("3")).toBe(3);
    expect(parseSessionsPage(["4", "5"])).toBe(4);
  });

  it("falls back to page 1 for anything else", () => {
    for (const bad of [undefined, "", "0", "-1", "abc", "1.5", "9999999", "2e3"]) {
      expect(parseSessionsPage(bad), String(bad)).toBe(1);
    }
  });
});

describe("pageCount", () => {
  it("rounds up and is at least 1", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(10)).toBe(1);
    expect(pageCount(11)).toBe(2);
    expect(pageCount(95)).toBe(10);
  });
});

describe("sessionsPageHref", () => {
  it("sets the param and drops it on page 1", () => {
    expect(sessionsPageHref("/accounts/u1", {}, 3)).toBe("/accounts/u1?sessionsPage=3");
    expect(sessionsPageHref("/accounts/u1", { sessionsPage: "3" }, 1)).toBe("/accounts/u1");
  });

  it("keeps other params", () => {
    expect(sessionsPageHref("/accounts/u1", { tab: "x", sessionsPage: "2" }, 4)).toBe(
      "/accounts/u1?tab=x&sessionsPage=4",
    );
  });
});
