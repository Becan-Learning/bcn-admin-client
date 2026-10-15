import "server-only";

import { backendErrorKey } from "@/lib/accounts/errors";
import { backendUrl } from "@/lib/auth/backend";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { forwardedHeaders } from "@/lib/auth/forwarded-headers";
import { contentVersionsResponseSchema, ownerPath, type ContentOwnerKind, type ContentVersion } from "@/lib/content/types";
import { toBackendCoursesQuery, type CoursesQueryState } from "./course-query-state";
import {
  adminChapterSchema,
  adminChaptersResponseSchema,
  adminCourseSchema,
  adminCoursesResponseSchema,
  adminInstitutionsResponseSchema,
  adminMajorsResponseSchema,
  groupMajors,
  type AdminChapter,
  type AdminCourse,
  type AdminInstitution,
  type InstitutionWithMajors,
} from "./types";

export type InstitutionsResult =
  | { ok: true; institutions: InstitutionWithMajors[] }
  | { ok: false; errorKey: AuthErrorKey };

async function failure(response: Response): Promise<{ ok: false; errorKey: AuthErrorKey }> {
  let code: string | undefined;
  try {
    const body: unknown = await response.json();
    const value = (body as { error?: { code?: unknown } } | null)?.error?.code;
    if (typeof value === "string") code = value;
  } catch {
    // Not JSON (a proxy error page, say): the status alone decides.
  }
  return { ok: false, errorKey: backendErrorKey({ status: response.status, code }) };
}

async function get(path: string, incoming: Pick<Headers, "get">): Promise<Response | null> {
  try {
    return await fetch(`${backendUrl()}/api/v1/admin/${path}`, {
      headers: forwardedHeaders(incoming),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

// Every Institution with its Majors, for the Institutions and Majors page: two reads
// (`GET /admin/institutions`, `GET /admin/majors`) with the visitor's cookie forwarded, joined here.
// Expected failures come back as an `errorKey`, never as a throw. Call it from a component inside
// <Suspense>: it needs the request headers.
export async function fetchInstitutionsWithMajors(
  incoming: Pick<Headers, "get">,
): Promise<InstitutionsResult> {
  const [institutionsResponse, majorsResponse] = await Promise.all([
    get("institutions", incoming),
    get("majors", incoming),
  ]);
  if (!institutionsResponse || !majorsResponse) return { ok: false, errorKey: "NETWORK" };
  if (!institutionsResponse.ok) return failure(institutionsResponse);
  if (!majorsResponse.ok) return failure(majorsResponse);

  const institutions = adminInstitutionsResponseSchema.safeParse(
    await institutionsResponse.json().catch(() => null),
  );
  const majors = adminMajorsResponseSchema.safeParse(await majorsResponse.json().catch(() => null));
  if (!institutions.success || !majors.success) {
    console.error("Invalid Institutions or Majors response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, institutions: groupMajors(institutions.data.institutions, majors.data.majors) };
}

export type AdminInstitutionsResult =
  | { ok: true; institutions: AdminInstitution[] }
  | { ok: false; errorKey: AuthErrorKey };

// The Institutions alone (`GET /admin/institutions`), for the Course filter and the Course forms. The
// caller decides how bad a failure is: the Courses list still works without them.
export async function fetchAdminInstitutions(
  incoming: Pick<Headers, "get">,
): Promise<AdminInstitutionsResult> {
  const response = await get("institutions", incoming);
  if (!response) return { ok: false, errorKey: "NETWORK" };
  if (!response.ok) return failure(response);
  const parsed = adminInstitutionsResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("Invalid Institutions response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, institutions: parsed.data.institutions };
}

export type CoursesResult =
  | { ok: true; courses: AdminCourse[] }
  | { ok: false; errorKey: AuthErrorKey };

// Every Course in every status that matches the filters (`GET /admin/courses?status&institutionId&search`),
// in the backend's order. Not paged: the backend list is not paged.
export async function fetchCourses(
  state: CoursesQueryState,
  incoming: Pick<Headers, "get">,
): Promise<CoursesResult> {
  const query = toBackendCoursesQuery(state).toString();
  const response = await get(query ? `courses?${query}` : "courses", incoming);
  if (!response) return { ok: false, errorKey: "NETWORK" };
  if (!response.ok) return failure(response);
  const parsed = adminCoursesResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("Invalid Courses response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, courses: parsed.data.courses };
}

export type CourseResult =
  | { ok: true; course: AdminCourse }
  | { ok: false; errorKey: AuthErrorKey };

// One Course with its counts and `deletable` (`GET /admin/courses/:id`). A malformed or unknown id is
// `COURSE_NOT_FOUND`, which the page turns into its not-found screen.
export async function fetchCourse(id: string, incoming: Pick<Headers, "get">): Promise<CourseResult> {
  const response = await get(`courses/${encodeURIComponent(id)}`, incoming);
  if (!response) return { ok: false, errorKey: "NETWORK" };
  if (!response.ok) return failure(response);
  const parsed = adminCourseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("Invalid Course response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, course: parsed.data };
}

export type ChaptersResult =
  | { ok: true; chapters: AdminChapter[] }
  | { ok: false; errorKey: AuthErrorKey };

// Every Chapter of a Course in every state, by number (`GET /admin/courses/:id/chapters`). Drafts and
// Archived Chapters may share a number with a live one, so the caller groups them.
export async function fetchChapters(
  courseId: string,
  incoming: Pick<Headers, "get">,
): Promise<ChaptersResult> {
  const response = await get(`courses/${encodeURIComponent(courseId)}/chapters`, incoming);
  if (!response) return { ok: false, errorKey: "NETWORK" };
  if (!response.ok) return failure(response);
  const parsed = adminChaptersResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("Invalid Chapters response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, chapters: parsed.data.chapters };
}

export type ChapterResult =
  | { ok: true; chapter: AdminChapter }
  | { ok: false; errorKey: AuthErrorKey };

// One Chapter with its counts and `deletable` (`GET /admin/chapters/:id`). A malformed or unknown id is
// `CHAPTER_NOT_FOUND`, which the Chapter page turns into its not-found screen.
export async function fetchChapter(id: string, incoming: Pick<Headers, "get">): Promise<ChapterResult> {
  const response = await get(`chapters/${encodeURIComponent(id)}`, incoming);
  if (!response) return { ok: false, errorKey: "NETWORK" };
  if (!response.ok) return failure(response);
  const parsed = adminChapterSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("Invalid Chapter response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, chapter: parsed.data };
}

export type ContentVersionsResult =
  | { ok: true; versions: ContentVersion[] }
  | { ok: false; errorKey: AuthErrorKey };

// Every Content version of a Chapter or a Course, newest first, with its report, manifest, preview status and
// `deletable` (`GET /admin/{chapters|courses}/:id/versions`). One read carries everything the page shows.
export async function fetchContentVersions(
  kind: ContentOwnerKind,
  ownerId: string,
  incoming: Pick<Headers, "get">,
): Promise<ContentVersionsResult> {
  const response = await get(`${ownerPath(kind, ownerId)}/versions`, incoming);
  if (!response) return { ok: false, errorKey: "NETWORK" };
  if (!response.ok) return failure(response);
  const parsed = contentVersionsResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("Invalid Content versions response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, versions: parsed.data.versions };
}
