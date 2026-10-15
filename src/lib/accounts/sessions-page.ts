export const SESSIONS_PAGE_SIZE = 10;
export const SESSIONS_PAGE_PARAM = "sessionsPage";

const MAX_PAGE = 100_000;

// The `sessionsPage` search param (1-based) as a page number. A missing or bad value is page 1.
export function parseSessionsPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{1,6}$/.test(value)) return 1;
  const page = Number(value);
  return page >= 1 && page <= MAX_PAGE ? page : 1;
}

export function pageCount(total: number, pageSize = SESSIONS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

// The href of a page, keeping the other search params. Page 1 drops the param.
export function sessionsPageHref(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === SESSIONS_PAGE_PARAM) continue;
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) next.set(key, first);
  }
  if (page > 1) next.set(SESSIONS_PAGE_PARAM, String(page));
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}
