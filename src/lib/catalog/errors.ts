import { backendErrorKey } from "@/lib/accounts/errors";
import type { AuthErrorKey } from "@/lib/auth/errors";

// A failed Catalog call, as a key under `Errors` in messages/en.json. Every Catalog code the backend
// answers has its own message. A 400 from the body check carries no `code` (it answers
// `{ error: { message, details } }`), so a 400 without a known code is INVALID_REQUEST. Other statuses
// go through the shared mapper (401, 429 and the known codes). The backend's own text is never shown.
export function catalogErrorKey(failure: { status: number; code?: string }): AuthErrorKey {
  const key = backendErrorKey(failure);
  if (key === "UNKNOWN" && failure.status === 400) return "INVALID_REQUEST";
  return key;
}

// The form fields a backend code belongs to. A code not listed here is shown for the form as a whole.
export type CatalogField =
  | "id"
  | "slug"
  | "code"
  | "nameEn"
  | "nameAr"
  | "sortOrder"
  | "institutionId"
  | "icon"
  | "tone";

const FIELD_ERRORS: Record<string, CatalogField> = {
  INSTITUTION_ID_TAKEN: "id",
  MAJOR_ID_TAKEN: "id",
  INVALID_INSTITUTION: "institutionId",
  MAJOR_IN_USE: "institutionId",
  SLUG_TAKEN: "slug",
};

export function catalogFieldForError(code: string | undefined): CatalogField | null {
  if (!code || !Object.hasOwn(FIELD_ERRORS, code)) return null;
  return FIELD_ERRORS[code];
}

export type CatalogFailure = { field: CatalogField | null; errorKey: AuthErrorKey };

export function placeCatalogError(failure: { status: number; code?: string }): CatalogFailure {
  return { field: catalogFieldForError(failure.code), errorKey: catalogErrorKey(failure) };
}
