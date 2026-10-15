// "Sign in again, then come back": the page to return to travels in the `next` query parameter of
// /sign-in and /two-factor. Only a path on this app is followed, so the parameter cannot send an Admin
// to another site.
export const RETURN_PARAM = "next";

// The path when it is safe to navigate to, otherwise null. A same-origin path starts with a single
// "/" and has no backslash or control character (browsers treat "/\host" like "//host").
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (/[\\\u0000-\u001f]/.test(value)) return null;
  try {
    const resolved = new URL(value, "http://app.invalid");
    if (resolved.origin !== "http://app.invalid") return null;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return null;
  }
}

export function signInUrl(returnTo: string): string {
  const safe = safeReturnPath(returnTo);
  return safe ? `/sign-in?${RETURN_PARAM}=${encodeURIComponent(safe)}` : "/sign-in";
}

// Browser only: the safe return path of the current page's URL, or null.
export function returnPathFromLocation(): string | null {
  return safeReturnPath(new URLSearchParams(window.location.search).get(RETURN_PARAM));
}
