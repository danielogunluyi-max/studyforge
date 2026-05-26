import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "~/server/auth.config";

/**
 * Middleware to enforce authentication on protected routes.
 * Uses edge-compatible auth config to avoid bundling database dependencies.
 * Unauthenticated users accessing protected routes are redirected to login.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || 
                     req.nextUrl.pathname.startsWith("/register");
  
  // Protected routes that require authentication
  const protectedRoutes = ["/dashboard", "/my-notes", "/tutor", "/voice-tutor", "/scan", "/upload"];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // Redirect unauthenticated users from protected routes to login
  if (!isLoggedIn && isProtectedRoute) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from auth pages to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
