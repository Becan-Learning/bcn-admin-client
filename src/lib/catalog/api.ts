// Calls the browser makes to create and edit Institutions and Majors. Same origin: next.config.ts
// rewrites /api/v1/* to the backend, so the Admin's cookie goes along. Each write is audited by the
// backend (`institution.create|update`, `major.create|update`). Nothing here deletes: the backend has
// no such route.
import { placeCatalogError, type CatalogFailure } from "./errors";
import type {
  InstitutionChanges,
  InstitutionCreateBody,
  MajorChanges,
  MajorCreateBody,
} from "./form";

export type CatalogWriteResult = { ok: true } | ({ ok: false } & CatalogFailure);

async function errorCode(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    const code = (body as { error?: { code?: unknown } } | null)?.error?.code;
    return typeof code === "string" ? code : undefined;
  } catch {
    return undefined;
  }
}

async function write(
  method: "POST" | "PATCH",
  path: string,
  body: object,
): Promise<CatalogWriteResult> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/admin/${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, field: null, errorKey: "NETWORK" };
  }
  if (response.ok) return { ok: true };
  return {
    ok: false,
    ...placeCatalogError({ status: response.status, code: await errorCode(response) }),
  };
}

// 201, or 409 INSTITUTION_ID_TAKEN.
export const createInstitution = (body: InstitutionCreateBody) => write("POST", "institutions", body);

// 200, or 404 INSTITUTION_NOT_FOUND. The body is never empty: the caller sends only a real change.
export const editInstitution = (id: string, changes: InstitutionChanges) =>
  write("PATCH", `institutions/${encodeURIComponent(id)}`, changes);

// 201, 400 INVALID_INSTITUTION, or 409 MAJOR_ID_TAKEN.
export const createMajor = (body: MajorCreateBody) => write("POST", "majors", body);

// 200, 400 INVALID_INSTITUTION, 404 MAJOR_NOT_FOUND, or 409 MAJOR_IN_USE (Accounts hold the Major,
// so it cannot move to another Institution).
export const editMajor = (id: string, changes: MajorChanges) =>
  write("PATCH", `majors/${encodeURIComponent(id)}`, changes);
