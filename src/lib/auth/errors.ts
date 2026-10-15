import messages from "../../../messages/en.json";

export type AuthErrorKey = keyof typeof messages.Errors;

// What Better Fetch hands back on a failed call (`{ error }` of an authClient method).
export type AuthClientError = {
  code?: string;
  status?: number;
  message?: string;
} | null | undefined;

function isKnownCode(code: string): code is AuthErrorKey {
  return Object.hasOwn(messages.Errors, code);
}

// Maps a Better Auth error to a key under `Errors` in messages/en.json. The backend's own message
// text is never shown: it is English prose that can change, and some of it is not meant for people.
export function authErrorKey(error: AuthClientError): AuthErrorKey {
  if (!error) return "UNKNOWN";
  if (error.status === 0) return "NETWORK";
  if (error.status === 429) return "RATE_LIMITED";
  if (error.code && isKnownCode(error.code)) return error.code;
  return "UNKNOWN";
}
