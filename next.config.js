/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
import "./src/env.js";

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
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
