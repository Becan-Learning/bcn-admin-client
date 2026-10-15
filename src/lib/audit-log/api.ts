import { z } from "zod";
import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";

const values = z.record(z.string(), z.unknown()).nullable();

const entrySchema = z.object({
  id: z.coerce.string(),
  actor: z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  before: values,
  after: values,
  reason: z.string().nullable(),
  createdAt: z.string(),
});

const pageSchema = z.object({
  entries: z.array(entrySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export type AuditEntry = z.infer<typeof entrySchema>;
export type AuditPage = z.infer<typeof pageSchema>;

export type AuditResult =
  | { ok: true; page: AuditPage }
  | { ok: false; errorKey: AuthErrorKey };

// The backend's errors look like `{ error: { code, message } }`. Only the code is used: the
// message is mapped to our own text through `Errors` in messages/en.json.
async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}

// Same origin: next.config.ts rewrites /api/v1/* to the backend, so the Account cookie goes along.
export async function fetchAuditLog(
  query: URLSearchParams | string,
  signal?: AbortSignal,
): Promise<AuditResult> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin/audit-log?${query}`, {
      cache: "no-store",
      signal,
    });
  } catch {
    return { ok: false, errorKey: "NETWORK" };
  }

  if (!response.ok) {
    const code = await errorCode(response);
    return { ok: false, errorKey: authErrorKey({ code, status: response.status }) };
  }

  try {
    const parsed = pageSchema.safeParse(await response.json());
    if (parsed.success) return { ok: true, page: parsed.data };
  } catch {
    // Not JSON: treated like any other unreadable answer.
  }
  return { ok: false, errorKey: "UNKNOWN" };
}
