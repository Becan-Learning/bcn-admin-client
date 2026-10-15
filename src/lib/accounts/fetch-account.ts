import "server-only";

import { z } from "zod";
import { backendUrl } from "@/lib/auth/backend";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { forwardedHeaders } from "@/lib/auth/forwarded-headers";
import { backendErrorKey } from "./errors";

// Better Auth's admin `get-user`, which returns the user row (the plugin allows it for `user: get`).
// Only the columns the detail page shows are read; unknown fields are dropped.
const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  phoneNumber: z.string(),
  institutionId: z.string(),
  majorId: z.string(),
  role: z.string().nullish(),
  banned: z.boolean().nullish(),
  banExpires: z.string().nullish(),
  twoFactorEnabled: z.boolean().nullish(),
});

export type AccountProfile = z.infer<typeof profileSchema>;

export type AccountProfileResult =
  | { ok: true; account: AccountProfile }
  | { ok: false; errorKey: AuthErrorKey };

export async function fetchAccountProfile(
  id: string,
  incoming: Pick<Headers, "get">,
): Promise<AccountProfileResult> {
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

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    console.error("Invalid get-user response from the backend");
    return { ok: false, errorKey: "UNKNOWN" };
  }
  return { ok: true, account: parsed.data };
}
