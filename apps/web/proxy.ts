import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "tw_session";

/**
 * Send visitors without a session cookie to /login. This is only a fast
 * first pass: a cookie can be stale, and the API checks every request.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Everything except the API rewrite, Next internals, static files and
    // the sign-in page itself.
    "/((?!api|_next/static|_next/image|favicon.ico|login).*)",
  ],
};
