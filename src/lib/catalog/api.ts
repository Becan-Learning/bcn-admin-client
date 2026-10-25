// Calls the browser makes to create and edit Institutions, Majors and Courses. Same origin: next.config.ts
// rewrites /api/v1/* to the backend, so the Admin's cookie goes along. Each write is audited by the
// backend (`institution.create|update`, `major.create|update`, `course.create|update|set-status|delete`).
// Only a Course can be deleted; Institutions and Majors have no such route.
import { placeCatalogError, type CatalogFailure } from "./errors";
import type { CourseChanges, CourseCreateBody } from "./course-form";
import type { CourseStatus } from "./types";
import type {
  InstitutionChanges,
  InstitutionCreateBody,
  MajorChanges,
  MajorCreateBody,
} from "./form";

export type CatalogWriteResult = { ok: true } | ({ ok: false } & CatalogFailure);

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}

async function send(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: object,
): Promise<{ ok: true; response: Response } | ({ ok: false } & CatalogFailure)> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin/${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, field: null, errorKey: "NETWORK" };
  }
  if (response.ok) return { ok: true, response };
  return {
    ok: false,
    ...placeCatalogError({ status: response.status, code: await errorCode(response) }),
  };
}

async function write(
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: object,
): Promise<CatalogWriteResult> {
  const result = await send(method, path, body);
  return result.ok ? { ok: true } : result;
}

// 201, or 409 INSTITUTION_ID_TAKEN.
export const createInstitution = (body: InstitutionCreateBody) => write("POST", "institutions", body);

// 200, or 404 INSTITUTION_NOT_FOUND. The body is never empty: the caller sends only a real change.
export const editInstitution = (id: string, changes: InstitutionChanges) =>
  write("PATCH", `institutions/${encodeURIComponent(id)}`, changes);

// 201, 400 INVALID_INSTITUTION, or 409 MAJOR_ID_TAKEN.
export const createMajor = (body: MajorCreateBody) => write("POST", "majors", body);

// 200, 400 INVALID_INSTITUTION, 404 MAJOR_NOT_FOUND, or 409 MAJOR_IN_USE (Accounts hold the Major,
// so it cannot move to another Institution).
export const editMajor = (id: string, changes: MajorChanges) =>
  write("PATCH", `majors/${encodeURIComponent(id)}`, changes);

// 201 with the new Course (a Draft; the caller opens its page by `id`), 400 INVALID_INSTITUTION, or
// 409 SLUG_TAKEN. `id` is null only if the answer carried none.
export async function createCourse(
  body: CourseCreateBody,
): Promise<{ ok: true; id: string | null } | ({ ok: false } & CatalogFailure)> {
  const result = await send("POST", "courses", body);
  if (!result.ok) return result;
  try {
    const created: unknown = await result.response.json();
    const id = (created as { id?: unknown } | null)?.id;
    return { ok: true, id: typeof id === "string" ? id : null };
  } catch {
    return { ok: true, id: null };
  }
}

// 200, 400 INVALID_INSTITUTION, 404 COURSE_NOT_FOUND, or 409 SLUG_TAKEN. The body is never empty: the
// caller sends only a real change.
export const editCourse = (id: string, changes: CourseChanges) =>
  write("PATCH", `courses/${encodeURIComponent(id)}`, changes);

// 200, 404 COURSE_NOT_FOUND, or 409: PUBLISH_PRECONDITION (back to Draft while a Chapter is Published)
// and SLUG_TAKEN (leaving Archived onto a slug another non-Archived Course now holds).
export const setCourseStatus = (id: string, status: CourseStatus) =>
  write("PUT", `courses/${encodeURIComponent(id)}/status`, { status });

// 204, 404 COURSE_NOT_FOUND, or 409 COURSE_IN_USE (Enrollments, Sessions or Content versions exist).
export const deleteCourse = (id: string) => write("DELETE", `courses/${encodeURIComponent(id)}`);
