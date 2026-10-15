import { describe, expect, it } from "vitest";
import {
  accountsHref,
  DEFAULT_STATE,
  hasActiveFilters,
  PAGE_SIZE,
  parseAccountsSearchParams,
  serializeAccountsState,
  toBackendQuery,
  withFilterChange,
  type AccountsQueryState,
} from "@/lib/accounts/query-state";

const full: AccountsQueryState = {
  search: "سارة",
  role: "admin",
  institutionId: "ksu",
  majorId: "ksu-cs",
  banned: false,
  sortBy: "name",
  sortDirection: "asc",
  page: 3,
};

describe("parseAccountsSearchParams", () => {
  it("returns the defaults for an empty URL", () => {
    expect(parseAccountsSearchParams({})).toEqual({
      search: "",
      role: undefined,
      institutionId: undefined,
      majorId: undefined,
      banned: undefined,
      sortBy: "createdAt",
      sortDirection: "desc",
      page: 1,
    });
  });

  it("reads every parameter", () => {
    expect(
      parseAccountsSearchParams({
        search: " سارة ",
        role: "admin",
        institution: "ksu",
        major: "ksu-cs",
        banned: "false",
        sort: "name",
        dir: "asc",
        page: "3",
      }),
    ).toEqual(full);
  });

  it("ignores values it does not know instead of failing", () => {
    expect(
      parseAccountsSearchParams({
        role: "owner",
        banned: "maybe",
        sort: "password",
        dir: "up",
        page: "abc",
      }),
    ).toEqual(parseAccountsSearchParams({}));
  });

  it.each(["0", "-2", "1.5", "2e3", ""])("treats page=%j as page 1", (page) => {
    expect(parseAccountsSearchParams({ page }).page).toBe(1);
  });

  it("caps an absurd page", () => {
    expect(parseAccountsSearchParams({ page: "99999999999999" }).page).toBe(100_000);
  });

  it("takes the first of a repeated parameter", () => {
    expect(parseAccountsSearchParams({ role: ["admin", "user"] }).role).toBe("admin");
  });

  it("drops a Major that has no Institution", () => {
    expect(parseAccountsSearchParams({ major: "ksu-cs" }).majorId).toBeUndefined();
  });

  it("treats a blank search as none and caps a long one", () => {
    expect(parseAccountsSearchParams({ search: "   " }).search).toBe("");
    expect(parseAccountsSearchParams({ search: "a".repeat(500) }).search).toHaveLength(200);
  });
});

describe("serializeAccountsState", () => {
  it("leaves out defaults, so the plain list has no query", () => {
    expect(serializeAccountsState(DEFAULT_STATE).toString()).toBe("");
    expect(accountsHref(DEFAULT_STATE)).toBe("/accounts");
  });

  it("round-trips a full state, Arabic included", () => {
    const query = serializeAccountsState(full);
    expect(parseAccountsSearchParams(Object.fromEntries(query))).toEqual(full);
    expect(accountsHref(full)).toBe(`/accounts?${query.toString()}`);
  });

  it("round-trips banned=true and banned=false separately", () => {
    for (const banned of [true, false]) {
      const state = { ...DEFAULT_STATE, banned };
      expect(parseAccountsSearchParams(Object.fromEntries(serializeAccountsState(state))).banned).toBe(
        banned,
      );
    }
  });

  it("does not write a Major without an Institution", () => {
    expect(serializeAccountsState({ ...DEFAULT_STATE, majorId: "ksu-cs" }).has("major")).toBe(false);
  });
});

describe("withFilterChange", () => {
  it("goes back to the first page", () => {
    expect(withFilterChange(full, { role: "user" }).page).toBe(1);
  });

  it("clears the Major when the Institution changes", () => {
    const next = withFilterChange(full, { institutionId: "kau" });
    expect(next.institutionId).toBe("kau");
    expect(next.majorId).toBeUndefined();
  });

  it("keeps the Major when the Institution is unchanged", () => {
    expect(withFilterChange(full, { institutionId: "ksu" }).majorId).toBe("ksu-cs");
    expect(withFilterChange(full, { search: "x" }).majorId).toBe("ksu-cs");
  });

  it("sets a Major together with a new Institution", () => {
    const next = withFilterChange(DEFAULT_STATE, { institutionId: "kau", majorId: "kau-cs" });
    expect(next).toMatchObject({ institutionId: "kau", majorId: "kau-cs" });
  });

  it("clears the Major when the Institution is cleared", () => {
    const next = withFilterChange(full, { institutionId: undefined });
    expect(next.institutionId).toBeUndefined();
    expect(next.majorId).toBeUndefined();
  });
});

describe("hasActiveFilters", () => {
  it("is false for the defaults and for sort and page alone", () => {
    expect(hasActiveFilters(DEFAULT_STATE)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_STATE, sortBy: "name", page: 4 })).toBe(false);
  });

  it("is true for any filter, banned=false included", () => {
    expect(hasActiveFilters({ ...DEFAULT_STATE, search: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_STATE, role: "user" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_STATE, institutionId: "ksu" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_STATE, banned: false })).toBe(true);
  });
});

describe("toBackendQuery", () => {
  it("asks for the first page, newest first", () => {
    expect(toBackendQuery(DEFAULT_STATE).toString()).toBe(
      `sortBy=createdAt&sortDirection=desc&limit=${PAGE_SIZE}&offset=0`,
    );
  });

  it("maps the state to the backend's parameter names and offset", () => {
    const query = toBackendQuery(full);
    expect(Object.fromEntries(query)).toEqual({
      search: "سارة",
      role: "admin",
      institutionId: "ksu",
      majorId: "ksu-cs",
      banned: "false",
      sortBy: "name",
      sortDirection: "asc",
      limit: "25",
      offset: "50",
    });
  });
});
