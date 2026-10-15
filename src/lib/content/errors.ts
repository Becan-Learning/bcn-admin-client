import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";

// A failed upload (the direct POST to the backend), as a key under `Errors`. Unlike the other backend
// calls, a 401 here is a refused upload token (`UPLOAD_TOKEN_REQUIRED|INVALID|USED|EXPIRED`), not an ended
// Admin session, so the code decides before the status does. A reply without a code (a proxy in front of
// the backend, say) is read by its status. The backend's own text is never shown.
export function uploadErrorKey(failure: { status: number; code?: string }): AuthErrorKey {
  const key = authErrorKey(failure);
  if (key !== "UNKNOWN") return key;
  if (failure.status === 413) return "PAYLOAD_TOO_LARGE";
  if (failure.status === 415) return "UNSUPPORTED_UPLOAD_TYPE";
  if (failure.status === 400) return "INVALID_REQUEST";
  return "UNKNOWN";
}
