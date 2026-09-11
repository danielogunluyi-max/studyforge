/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
import "./src/env.js";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Phase 1 (May 2026) — TypeScript strict checks are now enforced at build
  // time (typescript.ignoreBuildErrors was lifted). Source-tree tsc is clean.
  //
  // ESLint is intentionally suppressed at build time because lifting it
  // exposed ~981 pre-existing stylistic errors (prefer-nullish-coalescing,
  // no-unsafe-* family, etc.) and ~113 warnings. None are functional bugs;
  // they are accumulated style/safety debt deferred to "Phase 1.5 — Lint
  // Cleanup". Run `cmd /c "npx --no-install eslint src"` for a local report.
  //
  // Lifting eslint.ignoreDuringBuilds again should happen only after that
  // cleanup phase lands. Lifting typescript.ignoreBuildErrors again should
  // never happen — leave it off.
  // Dev badge: keep off the sidebar footer (covers Collapse / Log out at bottom-left).
  // Next 15.2+ accepts `devIndicators.position` ('bottom-left' | 'bottom-right' | 'top-left' | 'top-right').
  devIndicators: {
    position: "bottom-right",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Conservative, app-safe security headers applied to every route. These four
  // are universally safe (they don't restrict app functionality). A strict
  // Content-Security-Policy is intentionally deferred — it needs per-request
  // nonces for Next.js inline hydration scripts and an inventory of the app's
  // media/camera features, so it should land as report-only first.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/voice-tutor", destination: "/tutor?mode=voice", permanent: false },
      { source: "/dashboard/nova-vision", destination: "/tutor?mode=vision", permanent: false },
      { source: "/nova-live", destination: "/tutor?mode=vision", permanent: false },
      { source: "/upload", destination: "/smart-upload", permanent: false },
      { source: "/scan", destination: "/smart-upload", permanent: false },
      { source: "/handwriting", destination: "/smart-upload", permanent: false },
      { source: "/youtube-import", destination: "/smart-upload", permanent: false },
      { source: "/audio", destination: "/smart-upload?tab=record", permanent: false },
      { source: "/lecture", destination: "/smart-upload?tab=lecture", permanent: false },
      { source: "/classroom-import", destination: "/smart-upload?tab=classroom", permanent: false },
      { source: "/quizlet-import", destination: "/smart-upload?tab=quizlet", permanent: false },
      { source: "/capture", destination: "/smart-upload", permanent: false },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress Sentry build logs. Source maps are only uploaded when
  // SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN are all present; otherwise
  // the wrapper is a no-op at build time and Sentry stays disabled at runtime
  // (see sentry.*.config.ts, which require a DSN).
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  // Proxy Sentry ingestion through a same-origin route so ad-blockers don't
  // drop events. This path is excluded from the auth middleware (see
  // middleware.ts matcher) so it stays publicly reachable.
  tunnelRoute: "/monitoring",
});
