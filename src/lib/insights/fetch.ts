import "server-only";

import { backendErrorKey } from "@/lib/accounts/errors";
import { backendUrl } from "@/lib/auth/backend";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { forwardedHeaders } from "@/lib/auth/forwarded-headers";
import type { InsightsRange } from "./range";
import { insightsSchema, type Insights } from "./types";

export type InsightsResult =
  | { ok: true; data: Insights }
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

// Fetches every Insights section in one call, forwarding the visitor's cookie. Expected failures come
// back as an `errorKey`, never as a throw. Call it from a component inside <Suspense>: it reads
// request headers.
export async function fetchInsights(
  range: InsightsRange,
  incoming: Pick<Headers, "get">,
): Promise<InsightsResult> {
  let response: Response;
  try {
    response = await fetch(`${backendUrl()}/api/v1/admin/insights?range=${range}`, {
      headers: forwardedHeaders(incoming),
      cache: "no-store",
    });
  } catch {
    return { ok: false, errorKey: "NETWORK" };
  }
  if (!response.ok) return failure(response);

  const parsed = insightsSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    console.error("Invalid Insights response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, data: parsed.data };
}
