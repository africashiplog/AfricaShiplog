import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth/jwt";

const PUBLIC_PAGE_PATHS = ["/login"];

// Security response headers (CSP, X-Frame-Options, ...) are set globally via
// `headers()` in next.config.ts — that covers every response, proxy-redirected
// or not, so they are not duplicated here.

/**
 * Lightweight gate: only checks that a syntactically valid, unexpired access
 * token cookie is present, so protected pages don't render for a logged-out
 * visitor. It does NOT check permissions — every API route and server action
 * re-verifies the full user + permission set against the database via
 * `requireAuth()` in `src/lib/auth/guard.ts`. Proxy has no DB access by design.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isPublicPage = PUBLIC_PAGE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const token = request.cookies.get("as_at")?.value;
  const session = token ? await verifyAccessToken(token) : null;

  if (!isPublicPage && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicPage && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
