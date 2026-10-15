import { describe, expect, it } from "vitest";
import {
  coursesHref,
  DEFAULT_COURSES_STATE,
  hasActiveCourseFilters,
  parseCoursesSearchParams,
  serializeCoursesState,
  toBackendCoursesQuery,
  type CoursesQueryState,
} from "@/lib/catalog/course-query-state";

const full: CoursesQueryState = { search: "فيزياء", status: "published", institutionId: "ksu" };

describe("parseCoursesSearchParams", () => {
  it("returns no filters for an empty URL", () => {
    expect(parseCoursesSearchParams({})).toEqual({
      search: "",
      status: undefined,
      institutionId: undefined,
    });
  });

  it("reads every parameter", () => {
    expect(
      parseCoursesSearchParams({ search: " فيزياء ", status: "published", institution: "ksu" }),
    ).toEqual(full);
  });

  it("falls back on bad values instead of throwing", () => {
    expect(parseCoursesSearchParams({ status: "deleted", institution: "Not A Slug!" })).toEqual({
      search: "",
      status: undefined,
      institutionId: undefined,
    });
    expect(parseCoursesSearchParams({ status: ["draft", "archived"] }).status).toBe("draft");
  });

  it("caps the search text", () => {
    expect(parseCoursesSearchParams({ search: "x".repeat(500) }).search).toHaveLength(200);
  });
});

describe("serializeCoursesState and coursesHref", () => {
  it("leaves the defaults out", () => {
    expect(serializeCoursesState(DEFAULT_COURSES_STATE).toString()).toBe("");
    expect(coursesHref(DEFAULT_COURSES_STATE)).toBe("/catalog/courses");
  });

  it("round-trips a full state", () => {
    const query = serializeCoursesState(full);
    expect(query.get("status")).toBe("published");
    expect(query.get("institution")).toBe("ksu");
    expect(parseCoursesSearchParams(Object.fromEntries(query))).toEqual(full);
    expect(coursesHref(full)).toMatch(/^\/catalog\/courses\?/);
  });

  it("drops a blank search", () => {
    expect(serializeCoursesState({ search: "   " }).toString()).toBe("");
  });
});

describe("hasActiveCourseFilters", () => {
  it("is false for the defaults and true for any filter", () => {
    expect(hasActiveCourseFilters(DEFAULT_COURSES_STATE)).toBe(false);
    expect(hasActiveCourseFilters({ search: "  " })).toBe(false);
    expect(hasActiveCourseFilters({ search: "x" })).toBe(true);
    expect(hasActiveCourseFilters({ search: "", status: "draft" })).toBe(true);
    expect(hasActiveCourseFilters({ search: "", institutionId: "ksu" })).toBe(true);
  });
});

describe("toBackendCoursesQuery", () => {
  it("uses the backend's names and sends nothing for no filters", () => {
    expect(toBackendCoursesQuery(DEFAULT_COURSES_STATE).toString()).toBe("");
    const query = toBackendCoursesQuery(full);
    expect(query.get("search")).toBe("فيزياء");
    expect(query.get("status")).toBe("published");
    expect(query.get("institutionId")).toBe("ksu");
    expect(query.has("institution")).toBe(false);
  });
});
