// Calls the browser makes to grant or end one Enrollment. Same origin: next.config.ts rewrites
// /api/v1/* to the backend, so the Admin's cookie goes along. Both write an Audit log entry.
import { backendErrorKey } from "./errors";
import type { ActionResult } from "./account-actions";

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}

async function enrollmentRoute(
  accountId: string,
  courseId: string,
  method: "PUT" | "DELETE",
): Promise<ActionResult> {
  let response: Response;
  try {
    response = await fetch(
      `/api/v1/admin/accounts/${encodeURIComponent(accountId)}/enrollments/${encodeURIComponent(courseId)}`,
      { method, cache: "no-store" },
    );
  } catch {
    return { ok: false, errorKey: "NETWORK" };
  }
  if (response.ok) return { ok: true };
  return {
    ok: false,
    errorKey: backendErrorKey({ status: response.status, code: await errorCode(response) }),
  };
}

// 201 when created, 200 when the Account already held the Course. Both are success.
// 409 ENROLLMENT_LIMIT_REACHED when the Plan's slots are full, 404 COURSE_NOT_FOUND.
export const grantEnrollment = (accountId: string, courseId: string) =>
  enrollmentRoute(accountId, courseId, "PUT");

// 204, or 404 ENROLLMENT_NOT_FOUND when there is no active Enrollment.
export const endEnrollment = (accountId: string, courseId: string) =>
  enrollmentRoute(accountId, courseId, "DELETE");
