import * as Sentry from '@sentry/nextjs'

// Edge-runtime Sentry init (middleware / edge routes). Inert unless a DSN is set.
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV,

  // Attach request context to edge/middleware events.
  sendDefaultPii: true,

  // Full tracing in dev, sampled in prod to control event volume.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Structured logs via Sentry.logger.*.
  enableLogs: true,

  debug: false,
})
