import { type NextRequest, NextResponse } from "next/server";
import NextAuth from "next-auth";

import { loginUrlFor, readReturnParam, safeReturnPath } from "~/lib/auth-redirect";
import { matchDisabledFeature } from "~/lib/disabled-features";
import { BUSY_MESSAGE } from "~/lib/groq";
import { isKnownAppPath } from "~/lib/known-app-paths";
import { checkSessionRateLimit } from "~/lib/session-rate-limit";
import { authConfig } from "~/server/auth.config";

// Edge-safe Auth.js instance: verifies the JWT session cookie without bundling
// the Credentials provider / bcryptjs / Prisma (those run in the Node runtime).
const { auth } = NextAuth(authConfig);

/**
 * Public routes — the `(landing)` + `(auth)` route groups. These never require
 * a session. Everything else is protected, including `/features`.
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
  "/privacy",
  "/terms",
  "/forgot-password",
  "/reset-password",
  "/error",
  "/sentry-test", // THROWAWAY — remove with src/app/sentry-test + src/app/api/sentry-test
]);

/** Auth pages a signed-in user should be bounced away from, into the app. */
const AUTH_PAGES = new Set<string>(["/login", "/signup", "/register"]);

/**
 * Intentional-public API routes (middleware allowlist).
 * Everything under `/api/*` not matching these requires a session → 401 JSON.
 * Route handlers still enforce auth as defense-in-depth.
 *
 * REVIEW THIS LIST before shipping new public endpoints.
 */
const PUBLIC_API_EXACT = new Set<string>(["/api/health"]);

const PUBLIC_API_PREFIXES = [
  "/api/auth", // NextAuth + signup / forgot / reset / providers
] as const;

const PUBLIC_API_PATTERNS: RegExp[] = [
  /^\/api\/concept-web\/shared\//, // share-token reads
  /^\/api\/learning-style\/shared\//, // opt-in public profile
];

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function isPublicApiPath(pathname: string): boolean {
  if (PUBLIC_API_EXACT.has(pathname)) return true;
  for (const prefix of PUBLIC_API_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return true;
  }
  return PUBLIC_API_PATTERNS.some((re) => re.test(pathname));
}

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

  const disabled = matchDisabledFeature(pathname);
  if (disabled) {
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("disabled", disabled.slug);
    return NextResponse.redirect(url);
  }

  const isAuthenticated = !!req.auth?.user;
  const userId =
    typeof req.auth?.user?.id === "string" && req.auth.user.id.length > 0
      ? req.auth.user.id
      : null;
  const rateKey =
    userId ??
    (typeof req.auth?.user?.email === "string" && req.auth.user.email.length > 0
      ? req.auth.user.email
      : null);

  // --- API: deny-by-default with PUBLIC_API allowlist ---
  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }
    // Gate on session presence — do not require user.id (JWT may only expose email until hydrated).
    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Baseline per-session rate limit for mutating API (covers all Groq/upload burns).
    if (MUTATING.has(req.method) && rateKey) {
      const rl = checkSessionRateLimit(`api-mutate:${rateKey}`, {
        limit: 90,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: BUSY_MESSAGE },
          {
            status: 429,
            headers: rl.retryAfterSec
              ? { "Retry-After": String(rl.retryAfterSec) }
              : undefined,
          },
        );
      }
    }

    // Generous GET floor — DoS cushion, not a normal-user throttle.
    if (req.method === "GET" && rateKey) {
      const rl = checkSessionRateLimit(`api-get:${rateKey}`, {
        limit: 300,
        windowMs: 60_000,
      });
      if (!rl.allowed) {
        return NextResponse.json(
          { error: BUSY_MESSAGE },
          {
            status: 429,
            headers: rl.retryAfterSec
              ? { "Retry-After": String(rl.retryAfterSec) }
              : undefined,
          },
        );
      }
    }

    return NextResponse.next();
  }

  // Signed-in users have no business on the auth pages — send them onward.
  // Honor callbackUrl / from so a deep link isn't dumped on /dashboard.
  if (isAuthenticated && AUTH_PAGES.has(pathname)) {
    const dest = safeReturnPath(readReturnParam(nextUrl.searchParams));
    return NextResponse.redirect(new URL(dest, resolveOrigin(req)));
  }

  // Public pages are always accessible.
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Protected workspace: bounce unauthenticated requests to /login only when
  // the path resolves to a real app route. Unknown paths fall through so
  // Next can render the public root not-found (Go to Kyvex / Log in).
  if (!isAuthenticated) {
    if (isKnownAppPath(pathname)) {
      return NextResponse.redirect(
        new URL(loginUrlFor(`${pathname}${nextUrl.search}`), resolveOrigin(req)),
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /monitoring      (Sentry tunnelRoute ingestion proxy)
     * - /_next/static/*  (Next.js build assets)
     * - /_next/image/*   (Next.js image optimization)
     * - favicon.ico
     * - any file with an extension (images, fonts, robots.txt, manifests, etc.)
     *
     * `/api/*` IS included — gated via PUBLIC_API allowlist above.
     */
    "/((?!monitoring|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
