import "server-only";

import type { ZodType } from "zod";
import { backendUrl } from "@/lib/auth/backend";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { forwardedHeaders } from "@/lib/auth/forwarded-headers";
import {
  allowanceSchema,
  catalogResponseSchema,
  enrollmentsResponseSchema,
  sessionsResponseSchema,
  type AccountAllowance,
  type AdminEnrollment,
  type CatalogCourse,
  type SessionsResponse,
} from "./detail-types";
import { backendErrorKey } from "./errors";

export type DetailResult<T> = { ok: true; data: T } | { ok: false; errorKey: AuthErrorKey };

async function errorKeyOf(response: Response): Promise<AuthErrorKey> {
  let code: string | undefined;
  try {
    const body: unknown = await response.json();
    const value = (body as { error?: { code?: unknown } } | null)?.error?.code;
    if (typeof value === "string") code = value;
  } catch {
    // Not JSON (a proxy error page, say): the status alone decides.
  }
  return backendErrorKey({ status: response.status, code });
}

// One read of an Account detail route with the visitor's cookie forwarded. Expected failures come
// back as an `errorKey`, never as a throw, so each section can show its own error and the rest of
// the page still renders. Call it from a component inside <Suspense>: it needs request headers.
async function read<T>(
  path: string,
  schema: ZodType<T>,
  incoming: Pick<Headers, "get"> | null,
): Promise<DetailResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${backendUrl()}${path}`, {
      headers: incoming ? forwardedHeaders(incoming) : undefined,
      cache: "no-store",
    });
  } catch {
    return { ok: false, errorKey: "NETWORK" };
  }
  if (!response.ok) return { ok: false, errorKey: await errorKeyOf(response) };

  const parsed = schema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error(`Invalid response from the backend for ${path}`);
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, data: parsed.data };
}

const accountPath = (id: string) => `/api/v1/admin/accounts/${encodeURIComponent(id)}`;

export function fetchEnrollments(
  accountId: string,
  incoming: Pick<Headers, "get">,
): Promise<DetailResult<AdminEnrollment[]>> {
  return read(`${accountPath(accountId)}/enrollments`, enrollmentsResponseSchema, incoming);
}

export function fetchAccountAllowance(
  accountId: string,
  incoming: Pick<Headers, "get">,
): Promise<DetailResult<AccountAllowance>> {
  return read(`${accountPath(accountId)}/allowance`, allowanceSchema, incoming);
}

export function fetchAccountSessions(
  accountId: string,
  page: { limit: number; offset: number },
  incoming: Pick<Headers, "get">,
): Promise<DetailResult<SessionsResponse>> {
  return read(
    `${accountPath(accountId)}/sessions?limit=${page.limit}&offset=${page.offset}`,
    sessionsResponseSchema,
    incoming,
  );
}

// The public Catalog, for the Course picker. No cookie.
export function fetchCatalogCourses(): Promise<DetailResult<CatalogCourse[]>> {
  return read("/api/v1/courses", catalogResponseSchema, null);
}
