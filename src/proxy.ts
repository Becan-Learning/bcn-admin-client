import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Pages that work without a session. The two-factor challenge finishes a pending sign-in, so it
// has only the backend's two-factor cookie, not a session cookie.
const PUBLIC_PATHS = ["/sign-in", "/two-factor"];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  // The cookie's presence is only a quick check. The dashboard layout verifies the session with
  // the backend, and the backend re-checks every call.
  if (!getSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!api(?:/|$)|_next(?:/|$)|_vercel(?:/|$)|.*\\..*).*)",
};
