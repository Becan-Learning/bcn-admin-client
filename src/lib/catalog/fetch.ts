import "server-only";

import { backendErrorKey } from "@/lib/accounts/errors";
import { backendUrl } from "@/lib/auth/backend";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { forwardedHeaders } from "@/lib/auth/forwarded-headers";
import {
  adminInstitutionsResponseSchema,
  adminMajorsResponseSchema,
  groupMajors,
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
