import { NextResponse } from "next/server";

import { edgeAuth } from "~/server/auth/edge";

/**
 * Public routes — the `(landing)` route group. These never require a session.
 * Everything else (the entire `(dashboard)` route group) is protected and will
 * redirect unauthenticated visitors to `/login`.
 */
const PUBLIC_PATHS = new Set<string>([
  "/",
  "/login",
  "/signup",
  "/register",
  "/about",
  "/features",
  "/privacy",
  "/terms",
  "/forgot-password",
  "/reset-password",
  "/error",
]);

export default edgeAuth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const isAuthenticated = !!req.auth?.user;

  // Public landing pages are always accessible.
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Any other path belongs to the protected (dashboard) workspace.
  // Boot unauthenticated requests back to /login, preserving the intended
  // destination so the app can optionally return the user there after sign-in.
  if (!isAuthenticated) {
    // Derive the true request origin from the host headers. Auth.js v5
    // normalizes `nextUrl` to NEXTAUTH_URL, so relying on `nextUrl.origin`
    // here would misroute local and preview-deployment traffic to production.
    const host =
      req.headers.get("x-forwarded-host") ??
      req.headers.get("host") ??
      nextUrl.host;
    const proto =
      req.headers.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");

    const loginUrl = new URL("/login", `${proto}://${host}`);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /api/*           (route handlers self-protect; /api/auth must stay public)
     * - /_next/static/*  (Next.js build assets)
     * - /_next/image/*   (Next.js image optimization)
     * - favicon.ico
     * - any file with an extension (images, fonts, robots.txt, manifests, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
