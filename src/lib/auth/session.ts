import "server-only";

import { headers } from "next/headers";
import { z } from "zod";
import { backendUrl } from "./backend";
import { forwardedHeaders } from "./forwarded-headers";

// Only what the dashboard uses. Unknown fields are dropped, so nothing else reaches the client.
const adminSessionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    name: z.string(),
    email: z.string(),
    emailVerified: z.boolean(),
    image: z.string().nullish(),
    role: z.string().nullish(),
    banned: z.boolean().nullish(),
    twoFactorEnabled: z.boolean().nullish()
  }),
  session: z.object({
    id: z.string().min(1),
    userId: z.string().min(1),
    expiresAt: z.coerce.date()
  })
});

export type AdminSession = z.infer<typeof adminSessionSchema>;

// `disableCookieCache=true` makes the backend read the session row, not the signed cookie cache, so
// a ban, a Role change or a two-factor change shows up at once.
export async function getSessionFromHeaders(
  incoming: Pick<Headers, "get">
): Promise<AdminSession | null> {
  const response = await fetch(`${backendUrl()}/api/auth/get-session?disableCookieCache=true`, {
    headers: forwardedHeaders(incoming),
    cache: "no-store"
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Session check failed (${response.status})`);

  const data: unknown = await response.json();
  if (data === null) return null;

  const parsed = adminSessionSchema.safeParse(data);
  if (!parsed.success) {
    console.error("Invalid session response from the backend");
    return null;
  }
  return parsed.data;
}

// Read the request outside any try/catch, so Next's dynamic-render signals are not swallowed.
export async function getSession(): Promise<AdminSession | null> {
  return getSessionFromHeaders(await headers());
}
