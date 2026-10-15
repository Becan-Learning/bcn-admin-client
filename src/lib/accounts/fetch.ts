import "server-only";

import { backendUrl } from "@/lib/auth/backend";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { forwardedHeaders } from "@/lib/auth/forwarded-headers";
import { backendErrorKey } from "./errors";
import { toBackendQuery, type AccountsQueryState } from "./query-state";
import {
  accountsResponseSchema,
  institutionsResponseSchema,
  type AccountsResponse,
  type Institution,
} from "./types";

export type AccountsResult =
  | { ok: true; data: AccountsResponse }
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

// Fetches one page of Accounts from the backend, forwarding the visitor's cookie. Expected failures
// come back as an `errorKey`, never as a throw, so the page can show them next to the filters.
// Call it from a component inside <Suspense>: it reads request headers.
export async function fetchAccounts(
  state: AccountsQueryState,
  incoming: Pick<Headers, "get">,
): Promise<AccountsResult> {
  let response: Response;
  try {
    response = await fetch(`${backendUrl()}/api/v1/admin/accounts?${toBackendQuery(state)}`, {
      headers: forwardedHeaders(incoming),
      cache: "no-store",
    });
  } catch {
    return { ok: false, errorKey: "NETWORK" };
  }
  if (!response.ok) return failure(response);

  const parsed = accountsResponseSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("Invalid Accounts response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, data: parsed.data };
}

// The Institutions and their Majors for the filter selects. Public, so no cookie. A failure is not
// fatal: the table still works, only the Institution and Major selects have no options.
export async function fetchInstitutions(): Promise<Institution[]> {
  try {
    const response = await fetch(`${backendUrl()}/api/v1/institutions`, { cache: "no-store" });
    if (!response.ok) return [];
    const parsed = institutionsResponseSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
