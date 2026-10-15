// The Accounts table's state, kept in the URL so a reload or the back button restores it. Pure
// functions only: parse the search params into a state, serialise a state back, and build the query
// the backend takes (`GET /api/v1/admin/accounts`).

export const PAGE_SIZE = 25;

export const ROLES = ["user", "admin"] as const;
export type AccountRole = (typeof ROLES)[number];

export const SORT_COLUMNS = ["createdAt", "name", "email"] as const;
export type AccountSortColumn = (typeof SORT_COLUMNS)[number];

export type SortDirection = "asc" | "desc";

export type AccountsQueryState = {
  search: string;
  role?: AccountRole;
  institutionId?: string;
  // Only ever set together with an Institution: a Major belongs to one.
  majorId?: string;
  banned?: boolean;
  sortBy: AccountSortColumn;
  sortDirection: SortDirection;
  // 1-based.
  page: number;
};

export const DEFAULT_STATE: AccountsQueryState = {
  search: "",
  sortBy: "createdAt",
  sortDirection: "desc",
  page: 1,
};

// What a Next.js page gets as `searchParams`, or `Object.fromEntries` of a URLSearchParams.
export type RawSearchParams = Record<string, string | string[] | undefined>;

const MAX_TEXT = 200;
// A page this high is nonsense; capping keeps `offset` a safe integer.
const MAX_PAGE = 100_000;

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

function oneOf<T extends string>(values: readonly T[], raw: string | undefined): T | undefined {
  return values.find((value) => value === raw);
}

function text(raw: string | undefined): string | undefined {
  const value = raw?.trim().slice(0, MAX_TEXT);
  return value ? value : undefined;
}

// Never throws: a missing or bad value falls back to the default, so a hand-edited or stale URL
// still renders a table.
export function parseAccountsSearchParams(params: RawSearchParams): AccountsQueryState {
  const institutionId = text(first(params.institution));
  const majorId = institutionId ? text(first(params.major)) : undefined;
  const banned = oneOf(["true", "false"], first(params.banned));
  const page = /^[1-9]\d*$/.test(first(params.page) ?? "")
    ? Math.min(Number(first(params.page)), MAX_PAGE)
    : 1;

  return {
    search: text(first(params.search)) ?? "",
    role: oneOf(ROLES, first(params.role)),
    institutionId,
    majorId,
    banned: banned === undefined ? undefined : banned === "true",
    sortBy: oneOf(SORT_COLUMNS, first(params.sort)) ?? DEFAULT_STATE.sortBy,
    sortDirection: oneOf(["asc", "desc"], first(params.dir)) ?? DEFAULT_STATE.sortDirection,
    page,
  };
}

// Defaults are left out, so the plain list has a clean URL.
export function serializeAccountsState(state: AccountsQueryState): URLSearchParams {
  const params = new URLSearchParams();
  const search = state.search.trim();
  if (search) params.set("search", search);
  if (state.role) params.set("role", state.role);
  if (state.institutionId) {
    params.set("institution", state.institutionId);
    if (state.majorId) params.set("major", state.majorId);
  }
  if (state.banned !== undefined) params.set("banned", String(state.banned));
  if (state.sortBy !== DEFAULT_STATE.sortBy) params.set("sort", state.sortBy);
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) params.set("dir", state.sortDirection);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function accountsHref(state: AccountsQueryState): string {
  const query = serializeAccountsState(state).toString();
  return query ? `/accounts?${query}` : "/accounts";
}

// Changing a filter or the search starts again from the first page; a Major cannot outlive a
// change of Institution.
export function withFilterChange(
  state: AccountsQueryState,
  change: Partial<Omit<AccountsQueryState, "page">>,
): AccountsQueryState {
  const next = { ...state, ...change, page: 1 };
  if ("institutionId" in change && change.institutionId !== state.institutionId) {
    next.majorId = change.majorId;
  }
  if (!next.institutionId) next.majorId = undefined;
  return next;
}

export function hasActiveFilters(state: AccountsQueryState): boolean {
  return Boolean(
    state.search ||
      state.role ||
      state.institutionId ||
      state.majorId ||
      state.banned !== undefined,
  );
}

// The backend's query: same names as its zod schema in src/routes/admin-account.routes.ts.
export function toBackendQuery(state: AccountsQueryState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.search) params.set("search", state.search);
  if (state.role) params.set("role", state.role);
  if (state.institutionId) params.set("institutionId", state.institutionId);
  if (state.majorId) params.set("majorId", state.majorId);
  if (state.banned !== undefined) params.set("banned", String(state.banned));
  params.set("sortBy", state.sortBy);
  params.set("sortDirection", state.sortDirection);
  params.set("limit", String(PAGE_SIZE));
  params.set("offset", String((state.page - 1) * PAGE_SIZE));
  return params;
}
