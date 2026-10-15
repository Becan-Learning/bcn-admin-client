import { authErrorKey, type AuthErrorKey } from "@/lib/auth/errors";

// A failed backend call, as a key under `Errors` in messages/en.json. The backend answers
// `{ error: { message, code } }`; its message is never shown. 401 means the session ended.
export function backendErrorKey(failure: { status: number; code?: string }): AuthErrorKey {
  if (failure.status === 401) return "UNAUTHENTICATED";
  return authErrorKey(failure);
}
