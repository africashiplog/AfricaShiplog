import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap gate for the admin area: no session cookie -> login page.
 * Real authorization (session validity, role capabilities) is enforced in every
 * admin page, server action and API route against the database.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.get("igidi_session")?.value) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
