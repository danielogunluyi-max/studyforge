import { type NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "~/server/auth.config";

// Edge-safe Auth.js instance: verifies the JWT session cookie without bundling
// the Credentials provider / bcryptjs / Prisma (those run in the Node runtime).
const { auth } = NextAuth(authConfig);

/**
 * Public routes — the `(landing)` + `(auth)` route groups. These never require
 * a session. Everything else (the entire `(dashboard)` workspace) is protected.
 *
 * This is deny-by-default: any new route is protected unless explicitly listed
 * here, which is safer than maintaining an allow-list of protected prefixes.
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

/** Auth pages a signed-in user should be bounced away from, into the app. */
const AUTH_PAGES = new Set<string>(["/login", "/signup", "/register"]);

/**
 * Derive the true request origin from host headers. Auth.js v5 normalizes
 * `nextUrl` to NEXTAUTH_URL, so relying on `nextUrl.origin` here would misroute
 * local and preview-deployment traffic to production.
 */
function resolveOrigin(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

export default auth((req) => {
  const { nextUrl } = req;
  const { pathname } = nextUrl;
  const isAuthenticated = !!req.auth?.user;

  // Signed-in users have no business on the auth pages — send them to the app.
  if (isAuthenticated && AUTH_PAGES.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", resolveOrigin(req)));
  }

  // Public pages are always accessible.
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Protected workspace: bounce unauthenticated requests to /login, preserving
  // the intended destination so we can return the user there after sign-in.
  if (!isAuthenticated) {
    const loginUrl = new URL("/login", resolveOrigin(req));
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
     * - /monitoring      (Sentry tunnelRoute ingestion proxy)
     * - /_next/static/*  (Next.js build assets)
     * - /_next/image/*   (Next.js image optimization)
     * - favicon.ico
     * - any file with an extension (images, fonts, robots.txt, manifests, etc.)
     */
    "/((?!api|monitoring|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
