// Calls the browser makes for Content versions. Reads, set live, delete and the upload token go to the
// same-origin `/api/v1/admin/...` (next.config.ts rewrites it to the backend, so the Admin's cookie goes
// along). The upload itself is a direct POST to the backend's own origin, which the token response names:
// the zip never passes through this app, so the host's request size limit does not apply (backend B3).
// Audited by the backend: `content-version.upload|set-live|delete`.
import { send, write, type CatalogWriteResult } from "@/lib/catalog/api";
import type { CatalogFailure } from "@/lib/catalog/errors";
import type { AuthErrorKey } from "@/lib/auth/errors";
import { uploadErrorKey } from "./errors";
import {
  contentVersionSchema,
  ownerPath,
  uploadTokenSchema,
  type ContentOwnerKind,
  type ContentVersion,
  type UploadToken,
} from "./types";

// 200, 404 `*_NOT_FOUND`, or 503 `CONTENT_STORAGE_UNAVAILABLE`. The token works once, lasts five minutes and
// names this Chapter or Course, so ask for a fresh one for every upload attempt.
export async function requestUploadToken(
  kind: ContentOwnerKind,
  ownerId: string,
): Promise<{ ok: true; token: UploadToken } | ({ ok: false } & CatalogFailure)> {
  const result = await send("POST", `${ownerPath(kind, ownerId)}/upload-token`);
  if (!result.ok) return result;
  const parsed = uploadTokenSchema.safeParse(await result.response.json().catch(() => null));
  if (!parsed.success) return { ok: false, field: null, errorKey: "UNKNOWN" };
  return { ok: true, token: parsed.data };
}

export type UploadResult =
  | { ok: true; version: ContentVersion }
  | { ok: false; errorKey: AuthErrorKey; aborted?: boolean };

// The token is only ever sent to an http(s) URL.
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// POSTs the zip as the raw body with `Authorization: Bearer <token>`. XMLHttpRequest, not fetch, because only
// it reports upload progress. 201 carries the version, even for one that failed validation (`valid: false`
// and a report). The server's answer on failure is `{ error: { code } }`. Aborting with `signal` resolves
// `{ ok: false, aborted: true }`.
export function postZip(
  uploadUrl: string,
  token: string,
  body: Blob,
  options: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<UploadResult> {
  return new Promise((resolve) => {
    if (!isHttpUrl(uploadUrl)) {
      resolve({ ok: false, errorKey: "UNKNOWN" });
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("Content-Type", "application/zip");
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) options.onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () => resolve({ ok: false, errorKey: "NETWORK" });
    xhr.ontimeout = () => resolve({ ok: false, errorKey: "NETWORK" });
    xhr.onabort = () => resolve({ ok: false, errorKey: "NETWORK", aborted: true });
    xhr.onload = () => {
      let json: unknown = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // Not JSON: the status alone decides.
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        const parsed = contentVersionSchema.safeParse(json);
        resolve(parsed.success ? { ok: true, version: parsed.data } : { ok: false, errorKey: "UNKNOWN" });
        return;
      }
      const code = (json as { error?: { code?: unknown } } | null)?.error?.code;
      resolve({
        ok: false,
        errorKey: uploadErrorKey({ status: xhr.status, code: typeof code === "string" ? code : undefined }),
      });
    };

    if (options.signal) {
      if (options.signal.aborted) {
        resolve({ ok: false, errorKey: "NETWORK", aborted: true });
        return;
      }
      options.signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(body);
  });
}

// Token, then the upload. `onProgress` gets the share of the zip sent so far (0 to 1).
export async function uploadContent(
  kind: ContentOwnerKind,
  ownerId: string,
  body: Blob,
  options: { onProgress?: (fraction: number) => void; signal?: AbortSignal } = {},
): Promise<UploadResult> {
  const token = await requestUploadToken(kind, ownerId);
  if (!token.ok) return { ok: false, errorKey: token.errorKey };
  return postZip(token.token.uploadUrl, token.token.token, body, options);
}

// 200 with the version, 409 `VERSION_INVALID` (it failed validation), or 404. Setting live never changes a
// Chapter's state; the Chapter's lesson count comes from the version.
export const setLiveVersion = (kind: ContentOwnerKind, ownerId: string, versionId: string): Promise<CatalogWriteResult> =>
  write("PUT", `${ownerPath(kind, ownerId)}/live-version`, { versionId });

// 204, 409 `VERSION_IN_USE` (live, was live, or a Session used it), or 502 `CONTENT_STORAGE_FAILED` (the
// files could not be removed; the version stays and the delete can be retried).
export const deleteVersion = (kind: ContentOwnerKind, ownerId: string, versionId: string): Promise<CatalogWriteResult> =>
  write("DELETE", `${ownerPath(kind, ownerId)}/versions/${encodeURIComponent(versionId)}`);

