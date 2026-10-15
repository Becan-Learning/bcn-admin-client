import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  hasActiveFilters,
  pageCount,
  parseAuditFilters,
  toBackendQuery,
  toPageParams,
} from "@/lib/audit-log/filters";

const parse = (query: string) => parseAuditFilters(new URLSearchParams(query));

describe("parseAuditFilters", () => {
  it("defaults to the first page with no filters", () => {
    expect(parse("")).toEqual({ page: 1 });
  });

  it("reads every filter", () => {
    expect(
      parse("action=account.ban&actorId=a1&targetId=t1&from=2026-01-02&to=2026-02-03&page=4"),
    ).toEqual({
      page: 4,
      action: "account.ban",
      actorId: "a1",
      targetId: "t1",
      from: "2026-01-02",
      to: "2026-02-03",
    });
  });

  it("drops what the page cannot use", () => {
    expect(parse("action=account.nope&from=yesterday&to=2026-02-30&page=0")).toEqual({ page: 1 });
    expect(parse("page=-3")).toEqual({ page: 1 });
    expect(parse("page=2.5")).toEqual({ page: 1 });
    expect(parse("page=abc")).toEqual({ page: 1 });
    expect(parse("page=99999999999")).toEqual({ page: 1 });
    expect(parse(`targetId=${"x".repeat(201)}`)).toEqual({ page: 1 });
    expect(parse("actorId=%20%20")).toEqual({ page: 1 });
  });

  it("trims text filters", () => {
    expect(parse("targetId=%20abc%20").targetId).toBe("abc");
  });
});

describe("toPageParams", () => {
  it("leaves out defaults so a clean view has a clean URL", () => {
    expect(toPageParams({ page: 1 }).toString()).toBe("");
  });

  it("round-trips through parseAuditFilters", () => {
    const filters = {
      page: 3,
      action: "account.set-role" as const,
      actorId: "a1",
      targetId: "t1",
      from: "2026-01-02",
      to: "2026-02-03",
    };
    expect(parse(toPageParams(filters).toString())).toEqual(filters);
  });
});

describe("toBackendQuery", () => {
  it("turns the page into limit and offset", () => {
    const query = toBackendQuery({ page: 3 });
    expect(query.get("limit")).toBe(String(PAGE_SIZE));
    expect(query.get("offset")).toBe(String(2 * PAGE_SIZE));
  });

  it("names the target type with an Account id", () => {
    const query = toBackendQuery({ page: 1, targetId: "t1", actorId: "a1", action: "account.ban" });
    expect(query.get("targetType")).toBe("account");
    expect(query.get("targetId")).toBe("t1");
    expect(query.get("actorId")).toBe("a1");
    expect(query.get("action")).toBe("account.ban");
  });

  it("sends nothing for filters that are not set", () => {
    const query = toBackendQuery({ page: 1 });
    expect([...query.keys()].sort()).toEqual(["limit", "offset"]);
  });

  it("sends the dates as they are", () => {
    const query = toBackendQuery({ page: 1, from: "2026-01-02", to: "2026-02-03" });
    expect(query.get("from")).toBe("2026-01-02");
    expect(query.get("to")).toBe("2026-02-03");
  });
});

describe("paging helpers", () => {
  it("counts at least one page", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(PAGE_SIZE)).toBe(1);
    expect(pageCount(PAGE_SIZE + 1)).toBe(2);
  });

  it("tells whether any filter is set, ignoring the page", () => {
    expect(hasActiveFilters({ page: 5 })).toBe(false);
    expect(hasActiveFilters({ page: 1, from: "2026-01-01" })).toBe(true);
  });
});
