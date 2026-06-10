import * as Sentry from '@sentry/nextjs'

// Client-runtime Sentry init. Inert unless NEXT_PUBLIC_SENTRY_DSN is set.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  debug: false,
})

// Enables Sentry to track client-side navigation performance.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
