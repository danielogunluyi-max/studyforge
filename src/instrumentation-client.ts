import * as Sentry from '@sentry/nextjs'

// Client-runtime Sentry init. Inert unless NEXT_PUBLIC_SENTRY_DSN is set.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,

  // Attach user context (IP, headers) to client errors.
  sendDefaultPii: true,

  // Full tracing in dev, sampled in prod.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session Replay: record 10% of all sessions + 100% of sessions with an
  // error. Text and inputs are masked by default, so no passwords/PII are
  // captured while still recording layout, clicks, navigation, and network.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Structured logs via Sentry.logger.*.
  enableLogs: true,

  integrations: [Sentry.replayIntegration()],

  debug: false,
})

// Enables Sentry to track client-side navigation performance.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
