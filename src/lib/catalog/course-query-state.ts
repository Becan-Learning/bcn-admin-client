// The Courses list's state, kept in the URL so a reload or the back button restores it. Pure functions:
// parse the search params, serialise a state back, and build the query the backend takes
// (`GET /api/v1/admin/courses?status&institutionId&search`). There is no paging: the backend list is not
// paged and a Catalog has tens of Courses, so the page shows every match.
import type { RawSearchParams } from "@/lib/accounts/query-state";
import { isValidSlug } from "./slug";
import { COURSE_STATUSES, type CourseStatus } from "./types";

export type CoursesQueryState = {
  search: string;
  status?: CourseStatus;
  institutionId?: string;
};

export const DEFAULT_COURSES_STATE: CoursesQueryState = { search: "" };

const MAX_TEXT = 200;

function first(raw: string | string[] | undefined): string | undefined {
  return Array.isArray(raw) ? raw[0] : raw;
}

// Never throws: a missing or bad value falls back to "no filter", so a hand-edited or stale URL still
// renders the list. An Institution id that is not a slug would be a 400 from the backend, so it is
// dropped here.
export function parseCoursesSearchParams(params: RawSearchParams): CoursesQueryState {
  const search = first(params.search)?.trim().slice(0, MAX_TEXT) ?? "";
  const status = COURSE_STATUSES.find((value) => value === first(params.status));
  const institution = first(params.institution)?.trim();
  return {
    search,
    status,
    institutionId: institution && isValidSlug(institution) ? institution : undefined,
  };
}

// Defaults are left out, so the plain list has a clean URL.
export function serializeCoursesState(state: CoursesQueryState): URLSearchParams {
  const params = new URLSearchParams();
  const search = state.search.trim();
  if (search) params.set("search", search);
  if (state.status) params.set("status", state.status);
  if (state.institutionId) params.set("institution", state.institutionId);
  return params;
}

export function coursesHref(state: CoursesQueryState): string {
  const query = serializeCoursesState(state).toString();
  return query ? `/catalog/courses?${query}` : "/catalog/courses";
}

export function hasActiveCourseFilters(state: CoursesQueryState): boolean {
  return Boolean(state.search.trim() || state.status || state.institutionId);
}

// The backend's query: the names of its zod schema in src/routes/admin-catalog.routes.ts.
export function toBackendCoursesQuery(state: CoursesQueryState): URLSearchParams {
  const params = new URLSearchParams();
  const search = state.search.trim();
  if (search) params.set("search", search);
  if (state.status) params.set("status", state.status);
  if (state.institutionId) params.set("institutionId", state.institutionId);
  return params;
}
