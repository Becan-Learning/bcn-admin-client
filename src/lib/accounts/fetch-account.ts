import "server-only";

import { z } from "zod";
import { backendUrl } from "@/lib/auth/backend";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { forwardedHeaders } from "@/lib/auth/forwarded-headers";
import { backendErrorKey } from "./errors";

// Better Auth's admin `get-user`, which returns the user row. Only the name and email are read here;
// the detail page grows its own fetch with the next issue.
const summarySchema = z.object({ id: z.string(), name: z.string(), email: z.string() });

export type AccountSummaryResult =
  | { ok: true; account: z.infer<typeof summarySchema> }
  | { ok: false; errorKey: AuthErrorKey };

export async function fetchAccountSummary(
  id: string,
  incoming: Pick<Headers, "get">,
): Promise<AccountSummaryResult> {
  let response: Response;
  try {
    response = await fetch(`${backendUrl()}/api/auth/admin/get-user?id=${encodeURIComponent(id)}`, {
      headers: forwardedHeaders(incoming),
      cache: "no-store",
    });
  } catch {
    return { ok: false, errorKey: "NETWORK" };
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = (body as { code?: unknown } | null)?.code;
    return {
      ok: false,
      errorKey: backendErrorKey({
        status: response.status,
        code: typeof code === "string" ? code : undefined,
      }),
    };
  }

  const parsed = summarySchema.safeParse(body);
  if (!parsed.success) return { ok: false, errorKey: "UNKNOWN" };
  return { ok: true, account: parsed.data };
}
